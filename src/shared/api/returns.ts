import { routes, tillDefaults } from '@/shared/constants';
import type { Defect, Id, ReturnCondition, Sale, SaleReturn } from '@/shared/types';
import { convert, daysBetween, nowIso, toIsoDate, roundMoney, phoneDigits } from '@/shared/utils';
import { addBatchDefects, batchForDefect } from './costing';
import { addMovement, availableIn, currentUnitCost, placeIn, recordSale, variantIndex } from './engine';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';
import { alertLargeAmount, customerFor, openShiftOf, storeCreditOf, type CartItemInput, type TillPayment } from './till';
import { assertBranch } from './branchScope';

// Returns and exchanges at the till: finding the sale, what can come back under the country's policy, refunds,
// and exchanges linked to the first sale. A return is a new record; the sale itself is never changed.


const countryOf = (branchId: Id) => {
  const branch = findById(db.branches, branchId);
  return db.settings.countries.find((country) => country.countryCode === branch.countryCode);
};

// The branches whose sales this branch can take back: itself, plus the same country's other branches and online
// store when the country's policy allows returns from another branch, plus (for an exchange only) the other country's
// branches when the owner allows exchanges across countries.
const returnableFrom = (branchId: Id) => {
  const branch = findById(db.branches, branchId);
  const policy = countryOf(branchId)?.returns;
  return db.branches
    .filter((current) => current.kind !== 'warehouse')
    .filter((current) => current.id === branchId || (current.countryCode === branch.countryCode ? policy?.otherBranch : db.settings.crossCountryExchange))
    .map((current) => current.id);
};

// A sale from a branch in another country: it can only be exchanged here, at today's rate, never refunded.
const isCrossCountry = (sale: Sale, branchId: Id) => db.branches.find((branch) => branch.id === sale.branchId)?.countryCode !== findById(db.branches, branchId).countryCode;

const returnedQty = (saleId: Id, lineId: Id) =>
  db.returns.filter((saleReturn) => saleReturn.saleId === saleId).reduce((sum, saleReturn) => sum + saleReturn.lines.filter((line) => line.saleLineId === lineId).reduce((total, line) => total + line.qty, 0), 0);

export interface SaleMatch {
  saleId: Id;
  number: string;
  at: string;
  branchName: string;
  customerName: string;
  phone: string;
  pieces: number;
  total: number;
  currency: string;
}

// Finds sales to return: the receipt number (typed or scanned from the receipt's barcode), the customer's phone,
// or a day (YYYY-MM-DD).
export const findSalesForReturn = (branchId: Id, query: string) =>
  respond((): SaleMatch[] => {
    assertBranch(branchId);
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const digits = phoneDigits(needle);
    const isDay = /^\d{4}-\d{2}-\d{2}$/.test(needle);
    const branches = returnableFrom(branchId);
    return db.sales
      .filter((sale) => branches.includes(sale.branchId) && !sale.voidedAt)
      .filter((sale) => {
        const customer = db.customers.find((current) => current.id === sale.customerId);
        if (isDay) return toIsoDate(sale.at) === needle;
        return sale.number.toLowerCase() === needle || sale.number.toLowerCase().endsWith(needle) || (digits.length >= tillDefaults.phoneDigits && phoneDigits(customer?.phone ?? '').includes(digits));
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 30)
      .map((sale) => {
        const customer = db.customers.find((current) => current.id === sale.customerId);
        return {
          saleId: sale.id,
          number: sale.number,
          at: sale.at,
          branchName: db.branches.find((branch) => branch.id === sale.branchId)?.name ?? '',
          customerName: customer?.name ?? '',
          phone: customer?.phone ?? '',
          pieces: sale.lines.reduce((sum, line) => sum + line.qty, 0),
          total: roundMoney(sale.payments.reduce((sum, payment) => sum + payment.amount, 0)),
          currency: sale.currency,
        };
      });
  });

export type ReturnBlock = 'window' | 'nonReturnable' | 'saleItem';

export interface ReturnableLine {
  lineId: Id;
  variantId: Id;
  productId: Id;
  name: string;
  size: string;
  color: string;
  sku: string;
  photo?: string;
  bought: number;
  returned: number;
  left: number; // can still come back
  paidPerPiece: number; // after every discount: what the customer actually paid
  promotionName?: string;
  blocks: ReturnBlock[]; // why the policy stops a refund (an exchange may still be allowed)
}

export interface ChainLink {
  kind: 'sale' | 'return' | 'exchange';
  id: Id;
  number: string;
  at: string;
  amount: number;
}

export interface ReturnableSale {
  saleId: Id;
  number: string;
  at: string;
  branchId: Id;
  branchName: string;
  currency: string;
  customer?: { id: Id; name: string; phone: string; storeCredit: number };
  daysSince: number;
  windowDays: number;
  outsideWindow: boolean;
  refundMethodIds: Id[]; // where a refund can go under the policy
  crossCountry: boolean; // bought in the other country: exchange only, with prices converted to this branch's currency
  cashRefundLimit: number; // in the sale's currency: a cash refund above this needs the branch manager's approval PIN
  paidWith: Id[]; // the sale's own payment methods
  lines: ReturnableLine[];
  chain: ChainLink[]; // the first sale, then every return and exchange after it
}

// A card refund goes back to the card the sale was paid with.
const refundMethodsFor = (sale: Sale, branchId: Id) => {
  const policy = countryOf(branchId)?.returns;
  const methods = new Set<Id>();
  policy?.refundMethods.forEach((method) => {
    if (method === 'cash') methods.add('pm-cash');
    if (method === 'storeCredit') methods.add('pm-credit');
    if (method === 'cardReversal') sale.payments.forEach((payment) => db.settings.paymentMethods.find((current) => current.id === payment.methodId)?.kind === 'card' && methods.add(payment.methodId));
  });
  // The original method is always allowed (e.g. InstaPay back to InstaPay).
  sale.payments.forEach((payment) => payment.methodId !== 'pm-credit' && policy?.refundMethods.length && methods.add(payment.methodId));
  return [...methods];
};

// Every sale and return linked to a sale through exchanges, from the first sale on.
export const exchangeChain = (saleId: Id): ChainLink[] => {
  let first = findById(db.sales, saleId);
  for (let guard = 0; guard < 20; guard += 1) {
    const before = db.returns.find((saleReturn) => saleReturn.exchangeSaleId === first.id);
    if (!before) break;
    first = findById(db.sales, before.saleId);
  }
  const links: ChainLink[] = [];
  const walk = (sale: Sale) => {
    links.push({ kind: 'sale', id: sale.id, number: sale.number, at: sale.at, amount: roundMoney(sale.payments.reduce((sum, payment) => sum + payment.amount, 0)) });
    db.returns
      .filter((saleReturn) => saleReturn.saleId === sale.id)
      .sort((a, b) => a.at.localeCompare(b.at))
      .forEach((saleReturn) => {
        links.push({ kind: saleReturn.kind, id: saleReturn.id, number: saleReturn.number, at: saleReturn.at, amount: roundMoney(saleReturn.lines.reduce((sum, line) => sum + line.amount, 0)) });
        const next = saleReturn.exchangeSaleId && db.sales.find((current) => current.id === saleReturn.exchangeSaleId);
        if (next && links.length < 40) walk(next);
      });
  };
  walk(first);
  return links;
};

const describeSale = (sale: Sale, branchId: Id): ReturnableSale => {
  const index = variantIndex(db);
  const country = countryOf(branchId);
  const policy = country?.returns;
  const daysSince = Math.floor(daysBetween(toIsoDate(sale.at), toIsoDate(nowIso())));
  const windowDays = policy?.days ?? 0;
  const customer = db.customers.find((current) => current.id === sale.customerId);
  // Bought in the other country: everything is shown in this branch's currency, at today's rate.
  const crossCountry = isCrossCountry(sale, branchId);
  const currency = crossCountry ? findById(db.branches, branchId).currency : sale.currency;
  const inCurrency = (amount: number) => (crossCountry ? convert(amount, sale.currency, currency, nowIso(), db.rates, db.settings.baseCurrency) : amount);
  return {
    saleId: sale.id,
    number: sale.number,
    at: sale.at,
    branchId: sale.branchId,
    branchName: db.branches.find((branch) => branch.id === sale.branchId)?.name ?? '',
    currency,
    crossCountry,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone, storeCredit: storeCreditOf(db, customer.id) } : undefined,
    daysSince,
    windowDays,
    outsideWindow: daysSince > windowDays,
    refundMethodIds: crossCountry ? [] : refundMethodsFor(sale, branchId),
    cashRefundLimit: cashRefundLimit(currency),
    paidWith: sale.payments.map((payment) => payment.methodId),
    lines: sale.lines.map((line) => {
      const entry = index.get(line.variantId);
      const returned = returnedQty(sale.id, line.id);
      const blocks: ReturnBlock[] = [];
      if (daysSince > windowDays) blocks.push('window');
      if (db.settings.nonReturnable.productIds.includes(line.productId) || db.settings.nonReturnable.categoryIds.includes(line.categoryId)) blocks.push('nonReturnable');
      if (line.promotionId && policy?.saleItems === 'exchangeOnly') blocks.push('saleItem');
      return {
        lineId: line.id,
        variantId: line.variantId,
        productId: line.productId,
        name: entry?.product.name ?? '',
        size: entry?.variant.size ?? '',
        color: entry?.variant.color ?? '',
        sku: entry?.variant.sku ?? '',
        photo: entry?.product.photo,
        bought: line.qty,
        returned,
        left: line.qty - returned,
        paidPerPiece: roundMoney(inCurrency((line.unitPrice * line.qty - line.discount) / line.qty)),
        promotionName: line.promotionId ? db.promotions.find((promotion) => promotion.id === line.promotionId)?.name : undefined,
        blocks,
      };
    }),
    chain: exchangeChain(sale.id),
  };
};

export const getReturnableSale = (branchId: Id, saleId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const sale = findById(db.sales, saleId);
    if (!returnableFrom(branchId).includes(sale.branchId)) throw new ApiError('returnNotAllowed');
    return describeSale(sale, branchId);
  });

export interface ReturnLineInput {
  lineId: Id;
  qty: number;
  reasonId: Id;
  condition: ReturnCondition;
  defectOrigin?: 'received' | 'store';
  defectReasonId?: Id;
}

export interface ReturnInput {
  branchId: Id;
  saleId: Id;
  kind: 'return' | 'exchange';
  lines: ReturnLineInput[];
  refunds: TillPayment[]; // a return: where the money goes. An exchange: only a lower new total's difference.
  approvalIds?: Id[];
  exchange?: {
    items: CartItemInput[]; // at today's prices and promotions; no manual discount on an exchange
    payments: TillPayment[]; // what the customer pays on top when the new items cost more
    keepAsCredit: boolean; // the new items cost less: keep the difference as store credit instead of a refund
  };
}

// An approval the cashier got for this return; for a refund, only up to the amount the approver saw.
const approved = (ids: Id[] | undefined, kind: string, amount = 0) =>
  (ids ?? []).some((id) => db.approvals.find((approval) => approval.id === id && approval.kind === kind && approval.status === 'approved' && (approval.amount ?? 0) + 0.01 >= amount));

// The cash refund limit (set in the base currency in Policies) in the sale's currency, at today's rate.
const cashRefundLimit = (currency: string) =>
  roundMoney(convert(db.settings.refundApprovalAbove, db.settings.baseCurrency, currency, nowIso(), db.rates, db.settings.baseCurrency));

// Records a return or an exchange: checks the policy, puts the pieces where the cashier sent them, refunds what was
// actually paid, and for an exchange records the new sale linked to this one.
export const createReturn = (input: ReturnInput) =>
  mutate((): SaleReturn => {
    const branch = assertBranch(input.branchId);
    const me = actor();
    if (!openShiftOf(branch.id, me.id)) throw new ApiError('shiftClosed');
    const sale = findById(db.sales, input.saleId);
    if (!returnableFrom(branch.id).includes(sale.branchId)) throw new ApiError('returnNotAllowed');
    const view = describeSale(sale, branch.id);
    if (view.crossCountry && input.kind !== 'exchange') throw new ApiError('exchangeOnlyHere');
    const lines = input.lines.filter((line) => line.qty > 0);
    if (!lines.length) throw new ApiError('tooManyReturned');

    let value = 0;
    lines.forEach((line) => {
      const current = view.lines.find((candidate) => candidate.lineId === line.lineId);
      if (!current || line.qty > current.left) throw new ApiError('tooManyReturned');
      if (!db.settings.lists.returnReasons.some((option) => option.id === line.reasonId) || (line.condition === 'defective' && !line.defectOrigin)) throw new ApiError('reasonRequired');
      const policyBlocks = current.blocks.filter((block) => !(block === 'saleItem' && input.kind === 'exchange'));
      if (policyBlocks.length && !approved(input.approvalIds, 'returnOutsidePolicy')) throw new ApiError('returnNotAllowed');
      value += current.paidPerPiece * line.qty;
    });
    value = roundMoney(value);

    const cashBack = input.refunds.filter((refund) => refund.methodId === 'pm-cash').reduce((sum, refund) => sum + refund.amount, 0);
    if (cashBack > cashRefundLimit(sale.currency) && !approved(input.approvalIds, 'refund', cashBack)) throw new ApiError('approvalNeeded');
    if (input.refunds.some((refund) => refund.amount < 0 || !view.refundMethodIds.includes(refund.methodId))) throw new ApiError('notPaid');

    const saleReturn: SaleReturn = {
      id: newId(),
      number: nextNumber('R', 5),
      saleId: sale.id,
      branchId: branch.id,
      at: nowIso(),
      byId: me.id,
      kind: input.kind,
      lines: lines.map((line) => ({ saleLineId: line.lineId, qty: line.qty, amount: roundMoney((view.lines.find((current) => current.lineId === line.lineId)?.paidPerPiece ?? 0) * line.qty), reasonId: line.reasonId, condition: line.condition, defectOrigin: line.condition === 'defective' ? line.defectOrigin : undefined })),
      refunds: [],
      approvalIds: input.approvalIds,
    };

    if (input.kind === 'return') {
      const refunded = roundMoney(input.refunds.reduce((sum, refund) => sum + refund.amount, 0));
      if (Math.abs(refunded - value) > 0.01) throw new ApiError('notPaid');
      saleReturn.refunds = input.refunds.filter((refund) => refund.amount > 0).map(({ methodId, amount }) => ({ methodId, amount: roundMoney(amount) }));
    } else {
      // An exchange: the returned value becomes store credit used on the new sale. A lower new total leaves the
      // difference as credit or refunds it; a higher one is paid by the customer.
      const exchange = input.exchange;
      if (!exchange?.items.length) throw new ApiError('notPaid');
      const customer = customerFor(view.customer?.name ?? '', view.customer?.phone ?? '');
      const newSale = recordExchangeSale(branch.id, me.id, customer.id, exchange, value);
      const difference = roundMoney(value - newSale.total);
      // Across countries the new items must cost at least as much: nothing is refunded or kept as credit.
      if (view.crossCountry && difference > 0.01) throw new ApiError('exchangeTooLow');
      if (difference > 0 && !exchange.keepAsCredit) {
        const refunded = roundMoney(input.refunds.reduce((sum, refund) => sum + refund.amount, 0));
        if (Math.abs(refunded - difference) > 0.01) throw new ApiError('notPaid');
        saleReturn.refunds = [{ methodId: 'pm-credit', amount: roundMoney(value - difference) }, ...input.refunds.filter((refund) => refund.amount > 0).map(({ methodId, amount }) => ({ methodId, amount: roundMoney(amount) }))];
      } else {
        saleReturn.refunds = [{ methodId: 'pm-credit', amount: value }];
      }
      saleReturn.exchangeSaleId = newSale.sale.id;
    }
    db.returns.push(saleReturn);

    // Each piece goes where the cashier sent it. Defective pieces get a defect record: received that way -> back
    // to the brand; damaged in the store -> the store's loss, sent to the main warehouse.
    const stockBranch = branch.kind === 'online' ? db.branches.find((current) => current.kind === 'store' && current.countryCode === branch.countryCode) ?? branch : branch;
    lines.forEach((line) => {
      const saleLine = sale.lines.find((current) => current.id === line.lineId);
      if (!saleLine) return;
      const status = line.condition === 'available' ? 'available' : line.condition === 'toReturn' || line.defectOrigin === 'received' ? 'toReturn' : 'defective';
      addMovement(db, { variantId: saleLine.variantId, qty: line.qty, to: placeIn(stockBranch, line.condition === 'available' ? 'floor' : 'backRoom', status), kind: 'return', ref: { type: 'return', id: saleReturn.id }, at: saleReturn.at, byId: me.id }, newId);
      if (line.condition === 'defective') {
        const batch = batchForDefect(saleLine.productId, stockBranch.id);
        const defect: Defect = {
          id: newId(),
          at: saleReturn.at,
          byId: me.id,
          productId: saleLine.productId,
          variantId: saleLine.variantId,
          batchId: batch?.id,
          branchId: stockBranch.id,
          qty: line.qty,
          reasonId: line.defectReasonId ?? db.settings.lists.defectReasons[0]?.id ?? '',
          foundAt: line.defectOrigin === 'received' ? 'customerReturn' : 'store',
          liability: line.defectOrigin === 'received' ? 'brand' : 'store',
          status: 'open',
          unitCost: currentUnitCost(db, saleLine.productId, saleReturn.at),
          note: line.defectOrigin === 'store' ? 'Send to the main warehouse' : 'Return to the brand',
          locationId: placeIn(stockBranch, 'backRoom').locationId,
          // Received defective: already set aside for the brand, so the next return to the brand closes this defect.
          ...(line.defectOrigin === 'received' ? { markedToReturnById: me.id, markedToReturnAt: saleReturn.at } : {}),
        };
        db.defects.push(defect);
        addBatchDefects(batch?.id, line.qty);
        const product = db.products.find((current) => current.id === saleLine.productId);
        const managers = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.roleIds.includes('role-manager') && user.branchIds.includes(branch.id)).map((user) => user.id);
        notify('defectiveReturn', { branch: branch.name, product: product?.name ?? '' }, routes.owner.defects, managers);
      }
    });

    const refundTotal = roundMoney(saleReturn.refunds.filter((refund) => refund.methodId !== 'pm-credit' || input.kind === 'return').reduce((sum, refund) => sum + refund.amount, 0));
    const refundLimit = convert(db.settings.flagRules.refundAbove, db.settings.baseCurrency, sale.currency, nowIso(), db.rates, db.settings.baseCurrency);
    const largeRefund = refundTotal > refundLimit;
    logActivity({ action: 'refund', target: { type: 'return', id: saleReturn.id, label: saleReturn.number }, branchId: branch.id, amount: value, currency: sale.currency, flagged: largeRefund, alerted: largeRefund, changes: [{ field: 'sale', from: null, to: sale.number }] });
    // Above the limit in Activity › Flag settings: the owners and the branch's managers get an alert.
    if (largeRefund) alertLargeAmount({ kind: 'refund', branch: branch.name, amount: `${sale.currency} ${refundTotal}`, user: me.name }, branch.id);
    return saleReturn;
  });

// The new sale of an exchange, paid first with the returned value (as store credit), then by the customer.
const recordExchangeSale = (branchId: Id, cashierId: Id, customerId: Id, exchange: NonNullable<ReturnInput['exchange']>, credit: number) => {
  const index = variantIndex(db);
  const draft = recordSale(
    { ...db, sales: [], movements: [] },
    { branchId, cashierId, customerId, at: nowIso(), items: exchange.items.map((item) => ({ variantId: item.variantId, qty: item.qty })), payments: [{ methodId: 'pm-credit', share: 1 }], newId, number: 'draft', availableAt: () => Number.MAX_SAFE_INTEGER },
  );
  const total = roundMoney(draft.lines.reduce((sum, line) => sum + line.unitPrice * line.qty - line.discount, 0));
  exchange.items.forEach((item) => {
    if (!index.get(item.variantId)) throw new ApiError('notFound');
    if (availableIn(db, item.variantId, branchId) < item.qty) throw new ApiError('outOfStock');
  });
  const fromCredit = roundMoney(Math.min(credit, total));
  const toPay = roundMoney(total - fromCredit);
  const paid = roundMoney(exchange.payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (Math.abs(paid - toPay) > 0.01) throw new ApiError('notPaid');
  const payments: TillPayment[] = [{ methodId: 'pm-credit', amount: fromCredit }, ...exchange.payments.filter((payment) => payment.amount > 0)];
  const sale = recordSale(db, {
    branchId,
    cashierId,
    customerId,
    at: nowIso(),
    items: exchange.items.map((item) => ({ variantId: item.variantId, qty: item.qty })),
    payments: payments.map((payment) => ({ methodId: payment.methodId, share: total ? payment.amount / total : 0 })),
    newId,
    number: nextNumber('S', 6),
  });
  sale.payments = sale.payments.map((payment, position) => ({ ...payment, amount: payments[position].amount, reference: payments[position].reference }));
  logActivity({ action: 'create', target: { type: 'sale', id: sale.id, label: sale.number }, branchId, amount: total, currency: sale.currency });
  return { sale, total };
};

// The exchange history of a sale, for its receipt page.
export const getExchangeChain = (saleId: Id) =>
  respond(() => {
    const sale = findById(db.sales, saleId);
    const me = actor();
    if (!isOwner(me) && !me.branchIds.includes(sale.branchId)) assertBranch(sale.branchId);
    return exchangeChain(saleId);
  });
