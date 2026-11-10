import { mockConfig, routes, toPath, tillDefaults, withQuery } from '@/shared/constants';
import type { ApprovalKind, ApprovalLevel, ApprovalRequest, Branch, Customer, HeldSale, Id, ManualDiscount, PromoCode, Sale, User } from '@/shared/types';
import { currentTerms, nowIso, regularPrice, stockLevels, today, type StockLevel, roundMoney, phoneDigits, birthYearFromAge } from '@/shared/utils';
import { activePromotion, activeSalePrice, sellingPrice } from '@/shared/utils/pricing';
import type { Database } from './database';
import { availableIn, recordSale, variantIndex } from './engine';
import { ApiError } from './errors';
import { assertBranch, hasRole, notifyUsers } from './branchScope';
import { requiredApprovalLevel } from './branchApprovals';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, peopleAbove, respond } from './server';

// The cashier's counter: what can be sold in a branch, pricing a cart, approvals at the till, payment and
// completing a sale. Cashiers never get cost, margin, commission or profit from these calls.

// ---- Who can work where ----------------------------------------------------------------------------------------

const permissionsOf = (user: User) => new Set(db.roles.filter((role) => user.roleIds.includes(role.id)).flatMap((role) => role.permissions));

// ---- The counter's items ---------------------------------------------------------------------------------------

export interface CounterVariant {
  variantId: Id;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  price: number | null; // what the customer pays before promotions (a running sale price, else the regular price)
  regularPrice: number | null;
  promotion?: { name: string; perUnit: number }; // a promotion running on it in this branch today
  floor: number; // available on the shop floor
  backRoom: number; // available in the back room
  available: number;
}

export interface CounterProduct {
  productId: Id;
  name: string;
  brandId: Id;
  brandName: string;
  categoryId: Id;
  photo?: string;
  allowDiscounts: boolean; // the brand's terms allow discounts
  variants: CounterVariant[];
}

const locationKinds = (branch: Branch) => new Map(branch.locations.map((location) => [location.id, location.kind]));

const counterProduct = (data: Database, branch: Branch, productId: Id, levels: StockLevel[], now: string): CounterProduct | null => {
  const product = data.products.find((current) => current.id === productId);
  const brand = product && data.brands.find((current) => current.id === product.brandId);
  if (!product || !brand || product.archived || brand.status === 'paused') return null;
  const kinds = locationKinds(branch);
  const terms = currentTerms(brand);
  return {
    productId: product.id,
    name: product.name,
    brandId: brand.id,
    brandName: brand.name,
    categoryId: product.categoryId,
    photo: product.photo,
    allowDiscounts: terms.allowDiscounts,
    variants: product.variants
      .filter((variant) => !variant.archived)
      .map((variant) => {
        const here = levels.filter((level) => level.variantId === variant.id && level.branchId === branch.id && level.status === 'available');
        const at = (kind: string) => here.filter((level) => kinds.get(level.locationId) === kind).reduce((sum, level) => sum + level.qty, 0);
        const price = sellingPrice(data.schedules, product, variant, branch.currency, now) ?? null;
        const regular = regularPrice(data.schedules, product, variant, branch.currency, now) ?? null;
        const promo = price !== null && terms.allowDiscounts ? activePromotion(data.promotions, product, variant.id, branch.id, price, now) : undefined;
        return {
          variantId: variant.id,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          barcode: variant.barcode,
          price,
          regularPrice: regular,
          promotion: promo && promo.discount > 0 ? { name: promo.promotion.name, perUnit: promo.discount } : undefined,
          floor: at('floor'),
          backRoom: at('backRoom'),
          available: here.reduce((sum, level) => sum + level.qty, 0),
        };
      }),
  };
};

// Prices come from the same helpers recordSale uses, so the counter always shows what the sale will charge.
// Everything the counter can sell in a branch, with today's prices, promotions and stock on the floor and in the back room.
export const getCounterItems = (branchId: Id) =>
  respond((): CounterProduct[] => {
    const branch = assertBranch(branchId);
    const levels = stockLevels(db.movements);
    const now = nowIso();
    return db.products.flatMap((product) => counterProduct(db, branch, product.id, levels, now) ?? []).filter((product) => product.variants.length > 0);
  });

// ---- Pricing a cart --------------------------------------------------------------------------------------------

export interface CartItemInput {
  variantId: Id;
  qty: number;
  discount?: ManualDiscount;
}

export interface CartInput {
  branchId: Id;
  items: CartItemInput[];
  orderDiscount?: ManualDiscount;
  promoCode?: string;
}

export interface QuoteLine {
  variantId: Id;
  productId: Id;
  name: string;
  brandName: string;
  photo?: string;
  size: string;
  color: string;
  sku: string;
  qty: number;
  unitPrice: number;
  promotionName?: string;
  promotionDiscount: number; // for all pieces of the line
  codeDiscount: number;
  manualDiscount: number; // the line's own discount
  orderDiscount: number; // its share of the discount on the whole sale
  total: number;
  manualAllowed: boolean; // items on promotion or at a sale price (unless the owner allows it), and brands that don't allow discounts, can't get a manual discount
}

export interface ApprovalNeed {
  scope: 'line' | 'order';
  variantId?: Id;
  kind: ApprovalKind;
  level: ApprovalLevel;
  percent: number;
  limit: number; // the signed-in person's own limit
  amount: number;
  pendingId?: Id; // sent to a phone and still waiting
  rejected?: boolean; // sent and rejected: change the discount or ask again
}

export interface Quote {
  currency: string;
  vatRate: number;
  lines: QuoteLine[];
  subtotal: number; // before any discount
  discount: number; // every discount together
  total: number; // amount due, VAT included
  vat: number; // the VAT included in the total
  promoCodeId?: Id;
  codeError: boolean; // a code was typed that isn't valid today
  approvals: ApprovalNeed[]; // discounts above the person's limit without an approval yet
  discountLimit: number; // the signed-in person's limit, in percent
}


const activeCode = (code: string | undefined): PromoCode | undefined => {
  const needle = code?.trim().toUpperCase();
  if (!needle) return undefined;
  const day = today();
  return db.promoCodes.find((current) => current.code === needle && current.active && current.startDate <= day && current.endDate >= day);
};

// The discount limit of the signed-in person, in percent (owners have none).
const discountLimitOf = (user: User) => {
  if (isOwner(user)) return 100;
  const { cashier, manager } = db.settings.discountLimits;
  return hasRole(user, 'manager') ? manager : cashier;
};

// The approval a discount of `percent` by this person needs: none (within their own limit), a branch manager, or an
// owner (above the manager's limit, or when a manager is the one giving it).
const discountApprovalLevel = (user: User, percent: number): ApprovalLevel | null => {
  if (percent <= discountLimitOf(user) + 0.001) return null;
  return hasRole(user, 'manager') ? 'owner' : requiredApprovalLevel({ kind: 'discount', percent });
};

// An approval covers a discount up to the percent it was given for. Discounts are rounded to whole units of money, so
// "20%" can be 20.01% of the price: anything within a tenth of a percent counts as the same discount.
const approvalCovers = (approvalId: Id | undefined, percent: number) => {
  const approval = approvalId && db.approvals.find((current) => current.id === approvalId);
  return Boolean(approval && approval.status === 'approved' && (approval.percent ?? 0) + 0.1 >= percent);
};

// Where a discount's approval stands when it doesn't cover it yet: waiting on a phone, or rejected.
const approvalState = (approvalId: Id | undefined) => {
  const approval = approvalId && db.approvals.find((current) => current.id === approvalId);
  if (!approval) return {};
  return approval.status === 'pending' ? { pendingId: approval.id } : approval.status === 'rejected' ? { rejected: true } : {};
};

// A manual discount in money. Percentages are rounded to whole units of the currency, so the amount due stays a
// sum the cashier can take in notes and coins.
const manualAmount = (discount: ManualDiscount | undefined, base: number) =>
  discount ? Math.min(discount.type === 'percent' ? Math.round((base * discount.value) / 100) : discount.value, base) : 0;

const priceCart = (input: CartInput) => {
  const branch = assertBranch(input.branchId);
  const me = actor();
  const index = variantIndex(db);
  const now = nowIso();
  const code = activeCode(input.promoCode);
  const allowOnPromotion = db.settings.manualDiscountOnPromotion;

  // Each line's price after promotions and the code, then its own manual discount.
  const lines = input.items.flatMap((item) => {
    const entry = index.get(item.variantId);
    if (!entry || item.qty <= 0) return [];
    const { product, variant } = entry;
    const brand = db.brands.find((current) => current.id === product.brandId);
    const terms = brand ? currentTerms(brand) : undefined;
    const unitPrice = sellingPrice(db.schedules, product, variant, branch.currency, now) ?? 0;
    const promo = terms?.allowDiscounts ? activePromotion(db.promotions, product, variant.id, branch.id, unitPrice, now) : undefined;
    const promotionDiscount = roundMoney((promo?.discount ?? 0) * item.qty);
    const codeDiscount = code && terms?.allowDiscounts ? roundMoney((code.discountType === 'percent' ? (unitPrice * code.value) / 100 : code.value) * item.qty) : 0;
    // Already reduced (a promotion, or a sale price the owner set): no manual discount on top unless the owner allows it.
    const reduced = Boolean(promo || activeSalePrice(db.schedules, product, variant, branch.currency, now));
    const manualAllowed = Boolean(terms?.allowDiscounts) && (allowOnPromotion || !reduced);
    const base = Math.max(unitPrice * item.qty - promotionDiscount - codeDiscount, 0);
    const manualDiscount = manualAllowed ? roundMoney(manualAmount(item.discount, base)) : 0;
    return [{ item, product, variant, brandName: brand?.name ?? '', unitPrice, promo, promotionDiscount, codeDiscount, manualAllowed, base, manualDiscount }];
  });

  // The discount on the whole sale, split across the lines that can take a discount by what is left on each.
  const splittable = lines.filter((line) => line.manualAllowed);
  const splitBase = splittable.reduce((sum, line) => sum + line.base - line.manualDiscount, 0);
  const orderAmount = roundMoney(manualAmount(input.orderDiscount, splitBase));
  let left = orderAmount;
  const shares = new Map<Id, number>();
  splittable.forEach((line, position) => {
    const share = position === splittable.length - 1 ? left : roundMoney(splitBase ? (orderAmount * (line.base - line.manualDiscount)) / splitBase : 0);
    shares.set(line.variant.id, share);
    left = roundMoney(left - share);
  });

  // A discount is judged by the percent the cashier gave (a 10% discount is 10%, even when rounding to whole money makes
  // it 10.01% of the price); an amount off is judged by its real share of the price.
  const percentOf = (discount: ManualDiscount, amount: number, base: number) => (discount.type === 'percent' ? discount.value : (amount / base) * 100);
  const approvals: ApprovalNeed[] = [];
  lines.forEach((line) => {
    if (!line.item.discount || !line.manualDiscount || !line.base) return;
    const percent = percentOf(line.item.discount, line.manualDiscount, line.base);
    const level = discountApprovalLevel(me, percent);
    if (level && !approvalCovers(line.item.discount.approvalId, percent)) approvals.push({ scope: 'line', variantId: line.variant.id, kind: 'discount', level, percent, limit: discountLimitOf(me), amount: line.manualDiscount, ...approvalState(line.item.discount.approvalId) });
  });
  if (input.orderDiscount && orderAmount && splitBase) {
    const percent = percentOf(input.orderDiscount, orderAmount, splitBase);
    const level = discountApprovalLevel(me, percent);
    if (level && !approvalCovers(input.orderDiscount.approvalId, percent)) approvals.push({ scope: 'order', kind: 'discount', level, percent, limit: discountLimitOf(me), amount: orderAmount, ...approvalState(input.orderDiscount.approvalId) });
  }

  return { branch, code, lines, shares, approvals, codeError: Boolean(input.promoCode?.trim()) && !code };
};

const vatRateOf = (branch: Branch) => {
  const rates = db.vatRates.filter((rate) => rate.countryCode === branch.countryCode && rate.startDate <= today()).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return rates[0]?.rate ?? 0;
};

const toQuote = (priced: ReturnType<typeof priceCart>): Quote => {
  const lines: QuoteLine[] = priced.lines.map((line) => {
    const orderDiscount = priced.shares.get(line.variant.id) ?? 0;
    const total = roundMoney(Math.max(line.unitPrice * line.item.qty - line.promotionDiscount - line.codeDiscount - line.manualDiscount - orderDiscount, 0));
    return {
      variantId: line.variant.id,
      productId: line.product.id,
      name: line.product.name,
      brandName: line.brandName,
      photo: line.product.photo,
      size: line.variant.size,
      color: line.variant.color,
      sku: line.variant.sku,
      qty: line.item.qty,
      unitPrice: line.unitPrice,
      promotionName: line.promo && line.promotionDiscount ? line.promo.promotion.name : undefined,
      promotionDiscount: line.promotionDiscount,
      codeDiscount: line.codeDiscount,
      manualDiscount: line.manualDiscount,
      orderDiscount,
      total,
      manualAllowed: line.manualAllowed,
    };
  });
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0));
  const total = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  const vatRate = vatRateOf(priced.branch);
  return {
    currency: priced.branch.currency,
    vatRate,
    lines,
    subtotal,
    discount: roundMoney(subtotal - total),
    total,
    vat: roundMoney((total * vatRate) / (100 + vatRate)),
    promoCodeId: priced.code?.id,
    codeError: priced.codeError,
    approvals: priced.approvals,
    discountLimit: discountLimitOf(actor()),
  };
};

// Prices a cart the way the sale will be recorded: promotions, the code, manual discounts and the order discount.
export const quoteSale = (input: CartInput) => respond(() => toQuote(priceCart(input)));

// ---- Approvals at the till -------------------------------------------------------------------------------------

export interface ApprovalInput {
  branchId: Id;
  kind: ApprovalKind;
  level: ApprovalLevel;
  summary: string; // what is asked, e.g. "15% off Kracked hoodie"
  percent?: number;
  amount?: number;
  currency?: string;
}

export interface Approver {
  id: Id;
  name: string;
  level: ApprovalLevel; // the highest level they can approve
  locked: boolean;
}

// Who can approve at this branch's till: its managers (manager-level requests) and the owners (any request).
export const listApprovers = (branchId: Id, level: ApprovalLevel) =>
  respond((): Approver[] => {
    assertBranch(branchId);
    return db.users
      .filter((user) => user.status === 'active' && user.approvalPin && user.id !== actor().id)
      .filter((user) => isOwner(user) || (level === 'manager' && permissionsOf(user).has('approvals.decide') && user.branchIds.includes(branchId)))
      .map((user) => ({ id: user.id, name: user.name, level: isOwner(user) ? ('owner' as const) : ('manager' as const), locked: Boolean(user.approvalPinLocked) }));
  });

// A manager or owner approves at the till by entering their approval PIN. Too many wrong PINs lock it.
export const approveAtTill = (input: ApprovalInput, approverId: Id, pin: string) =>
  mutate((): ApprovalRequest => {
    assertBranch(input.branchId);
    const level = requiredApprovalLevel(input);
    const approver = findById(db.users, approverId);
    if (approver.id === actor().id) throw new ApiError('ownRequest');
    const allowed = isOwner(approver) || (level === 'manager' && permissionsOf(approver).has('approvals.decide') && approver.branchIds.includes(input.branchId));
    if (!allowed || approver.status !== 'active') throw new ApiError('notAllowed');
    if (approver.approvalPinLocked) throw new ApiError('approvalPinLocked');
    if (!approver.approvalPin || approver.approvalPin !== pin.trim()) {
      approver.approvalPinFails = (approver.approvalPinFails ?? 0) + 1;
      if (approver.approvalPinFails >= db.settings.approvalPinTries) {
        approver.approvalPinLocked = true;
        logActivity({ action: 'lock', target: { type: 'user', id: approver.id, label: approver.name }, branchId: input.branchId, flagged: true });
        throw new ApiError('approvalPinLocked');
      }
      throw new ApiError('wrongApprovalPin');
    }
    approver.approvalPinFails = 0;
    const approval: ApprovalRequest = {
      id: newId(),
      ...input,
      level,
      requestedById: actor().id,
      at: nowIso(),
      status: 'approved',
      decidedById: approver.id,
      decidedAt: nowIso(),
      channel: 'till',
    };
    db.approvals.unshift(approval);
    logActivity({ action: 'approve', target: { type: 'approval', id: approval.id, label: approval.summary }, userId: approver.id, branchId: input.branchId, amount: input.amount, currency: input.currency, flagged: true });
    return approval;
  });

// The manager isn't nearby: the request goes to their phone (and the owners' for owner-level requests).
export const requestApproval = (input: ApprovalInput) =>
  mutate((): ApprovalRequest => {
    assertBranch(input.branchId);
    const me = actor();
    const level = requiredApprovalLevel(input);
    const approval: ApprovalRequest = { id: newId(), ...input, level, requestedById: me.id, at: nowIso(), status: 'pending', channel: 'phone' };
    db.approvals.unshift(approval);
    const managers = db.users.filter((user) => user.status === 'active' && !isOwner(user) && permissionsOf(user).has('approvals.decide') && user.branchIds.includes(input.branchId)).map((user) => user.id);
    if (level === 'manager') notifyUsers('approvalWaiting', { summary: input.summary, user: me.name }, routes.manager.approvals, managers);
    notify('approvalWaiting', { summary: input.summary, user: me.name }, routes.owner.approvals, [], level === 'owner');
    logActivity({ action: 'send', target: { type: 'approval', id: approval.id, label: approval.summary }, branchId: input.branchId, amount: input.amount, currency: input.currency });
    return approval;
  });

// A request sent to a phone: the till waits for its answer.
export const getApproval = (approvalId: Id) =>
  respond(() => {
    const approval = findById(db.approvals, approvalId);
    return { ...approval, decidedByName: db.users.find((user) => user.id === approval.decidedById)?.name };
  });

// ---- Customers -------------------------------------------------------------------------------------------------

export interface CustomerView extends Customer {
  orders: number;
  storeCredit: number; // in the branch's currency
}

// Store credit: given on returns and exchanges, used as a payment. Never stored as a number, always worked out.
export const storeCreditOf = (data: Database, customerId: Id) => {
  const theirSales = data.sales.filter((sale) => sale.customerId === customerId);
  const saleIds = new Set(theirSales.map((sale) => sale.id));
  const given = data.returns.filter((saleReturn) => saleIds.has(saleReturn.saleId)).reduce((sum, saleReturn) => sum + saleReturn.refunds.filter((refund) => refund.methodId === 'pm-credit').reduce((total, refund) => total + refund.amount, 0), 0);
  const used = theirSales.reduce((sum, sale) => sum + sale.payments.filter((payment) => payment.methodId === 'pm-credit').reduce((total, payment) => total + payment.amount, 0), 0);
  return roundMoney(given - used);
};

const toCustomerView = (customer: Customer): CustomerView => ({
  ...customer,
  orders: db.sales.filter((sale) => sale.customerId === customer.id).length,
  storeCredit: storeCreditOf(db, customer.id),
});

// The customers seen most recently (their last purchase, or when they were added), newest first: the till's
// Customers page before anything is typed.
export const listRecentCustomers = () =>
  respond((): CustomerView[] => {
    const lastSeen = new Map<Id, string>();
    db.customers.forEach((customer) => lastSeen.set(customer.id, customer.createdAt));
    db.sales.forEach((sale) => {
      if (sale.customerId && sale.at > (lastSeen.get(sale.customerId) ?? '')) lastSeen.set(sale.customerId, sale.at);
    });
    return [...db.customers]
      .sort((a, b) => (lastSeen.get(b.id) ?? '').localeCompare(lastSeen.get(a.id) ?? ''))
      .slice(0, tillDefaults.recentCustomers)
      .map(toCustomerView);
  });

// Customers whose phone number contains what was typed.
export const findCustomers = (phone: string) =>
  respond((): CustomerView[] => {
    const needle = phoneDigits(phone);
    if (needle.length < tillDefaults.searchDigits) return [];
    return db.customers.filter((customer) => phoneDigits(customer.phone).includes(needle)).slice(0, 8).map(toCustomerView);
  });

export interface PurchaseView {
  saleId: Id;
  number: string;
  at: string;
  branchName: string;
  currency: string;
  total: number;
  lines: { name: string; size: string; color: string; qty: number; returned: number }[];
}

// A customer's details and past purchases (what they bought, never what it cost the store).
export const getTillCustomer = (customerId: Id) =>
  respond(() => {
    const customer = findById(db.customers, customerId);
    const index = variantIndex(db);
    const purchases: PurchaseView[] = db.sales
      .filter((sale) => sale.customerId === customerId && !sale.voidedAt)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((sale) => ({
        saleId: sale.id,
        number: sale.number,
        at: sale.at,
        branchName: db.branches.find((branch) => branch.id === sale.branchId)?.name ?? '',
        currency: sale.currency,
        total: roundMoney(sale.lines.reduce((sum, line) => sum + line.unitPrice * line.qty - line.discount, 0)),
        lines: sale.lines.map((line) => {
          const entry = index.get(line.variantId);
          const returned = db.returns.filter((saleReturn) => saleReturn.saleId === sale.id).reduce((sum, saleReturn) => sum + saleReturn.lines.filter((current) => current.saleLineId === line.id).reduce((total, current) => total + current.qty, 0), 0);
          return { name: entry?.product.name ?? '', size: entry?.variant.size ?? '', color: entry?.variant.color ?? '', qty: line.qty, returned };
        }),
      }));
    return { customer: toCustomerView(customer), purchases };
  });

// A discount or refund above the owner's limit: the owners (when the alert is on, or always for a manager's own) and
// the branch's other managers are told.
export const alertLargeAmount = (params: Record<string, string>, branchId: Id) => {
  const { managers, owners } = peopleAbove(actor().id, branchId);
  notify('largeDiscountOrRefund', params, routes.owner.activity, owners);
  if (managers.length) notify('largeDiscountOrRefund', params, withQuery(routes.manager.staff, { tab: 'discounts' }), managers, false);
};

// The customer with this phone number, or a new one saved for future sales.
// An age given at the till (optional) is kept as the year of birth, also for a customer already saved.
export const customerFor = (name: string, phone: string, age?: string): Customer => {
  const clean = phoneDigits(phone);
  const birthYear = birthYearFromAge(age);
  const existing = db.customers.find((customer) => phoneDigits(customer.phone) === clean);
  if (existing) {
    if (birthYear && existing.birthYear !== birthYear) existing.birthYear = birthYear;
    return existing;
  }
  const customer: Customer = { id: newId(), name: name.trim(), phone: phone.trim(), birthYear, createdAt: nowIso() };
  db.customers.push(customer);
  logActivity({ action: 'create', target: { type: 'customer', id: customer.id, label: customer.name } });
  return customer;
};

// ---- The card machine ------------------------------------------------------------------------------------------

export type CardDecline = 'declined' | 'insufficientFunds' | 'expired' | 'noConnection';
export type CardResult = { approved: true; reference: string } | { approved: false; reason: CardDecline };

const declines: CardDecline[] = ['declined', 'insufficientFunds', 'expired', 'noConnection'];

// Sends the amount to the card machine (simulated: it answers after a moment and sometimes declines).
export const sendToCardMachine = async (amount: number): Promise<CardResult> => {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.cardMachineDelayMs));
  if (amount <= 0) return { approved: false, reason: 'declined' };
  if (Math.random() < mockConfig.cardDeclineRate) return { approved: false, reason: declines[Math.floor(Math.random() * declines.length)] };
  return { approved: true, reference: String(Math.floor(100000 + Math.random() * 900000)) };
};

// ---- Completing a sale -----------------------------------------------------------------------------------------

export interface TillPayment {
  methodId: Id;
  amount: number;
  reference?: string; // InstaPay or wallet reference, or the card machine's approval code
}

export interface CompleteSaleInput extends CartInput {
  customer: { name: string; phone: string; age?: string };
  payments: TillPayment[];
  heldSaleId?: Id; // the sale was resumed from hold
}

// The open shift of the signed-in cashier in a branch.
export const openShiftOf = (branchId: Id, userId: Id) => db.shifts.find((shift) => shift.branchId === branchId && shift.cashierId === userId && !shift.closedAt);

// Checks everything, then records the sale with the shared recordSale: stock and sales update right away.
export const completeSale = (input: CompleteSaleInput) =>
  mutate((): Sale => {
    const me = actor();
    const priced = priceCart(input);
    const quote = toQuote(priced);
    const { branch } = priced;
    if (!openShiftOf(branch.id, me.id)) throw new ApiError('shiftClosed');
    if (!input.customer.name.trim() || phoneDigits(input.customer.phone).length < tillDefaults.phoneDigits) throw new ApiError('customerRequired');
    if (!quote.lines.length) throw new ApiError('notPaid');
    if (quote.approvals.length) throw new ApiError('approvalNeeded');
    if (priced.codeError) throw new ApiError('invalidCode');
    const hasReason = (discount?: ManualDiscount) => !discount || db.settings.lists.discountReasons.some((option) => option.id === discount.reasonId);
    if (!hasReason(input.orderDiscount) || input.items.some((item) => !hasReason(item.discount))) throw new ApiError('reasonRequired');
    if (input.items.some((item) => item.discount && !quote.lines.find((line) => line.variantId === item.variantId)?.manualAllowed)) throw new ApiError('noDiscountOnPromotion');

    const wanted = new Map<Id, number>();
    input.items.forEach((item) => wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.qty));
    if ([...wanted].some(([variantId, qty]) => availableIn(db, variantId, branch.id) < qty)) throw new ApiError('outOfStock');

    const paid = roundMoney(input.payments.reduce((sum, payment) => sum + payment.amount, 0));
    if (Math.abs(paid - quote.total) > 0.01 || input.payments.some((payment) => payment.amount < 0 || !branch.paymentMethodIds.includes(payment.methodId))) throw new ApiError('notPaid');

    const customer = customerFor(input.customer.name, input.customer.phone, input.customer.age);
    const credit = input.payments.filter((payment) => payment.methodId === 'pm-credit').reduce((sum, payment) => sum + payment.amount, 0);
    if (credit > storeCreditOf(db, customer.id) + 0.01) throw new ApiError('notEnoughCredit');

    const payments = input.payments.filter((payment) => payment.amount > 0);
    const sale = recordSale(db, {
      branchId: branch.id,
      cashierId: me.id,
      customerId: customer.id,
      at: nowIso(),
      items: quote.lines.map((line) => ({
        variantId: line.variantId,
        qty: line.qty,
        discount: line.manualDiscount + line.orderDiscount,
        discountReasonId: input.items.find((item) => item.variantId === line.variantId)?.discount?.reasonId ?? input.orderDiscount?.reasonId,
      })),
      payments: payments.map((payment) => ({ methodId: payment.methodId, share: quote.total ? payment.amount / quote.total : 0 })),
      promoCodeId: quote.promoCodeId,
      newId,
      number: nextNumber('S', 6),
    });
    // Exact amounts and references as paid (recordSale splits the total by shares).
    sale.payments = sale.payments.map((payment, position) => ({ ...payment, amount: payments[position].amount, reference: payments[position].reference }));

    if (input.heldSaleId) db.heldSales = db.heldSales.filter((held) => held.id !== input.heldSaleId);
    logActivity({ action: 'create', target: { type: 'sale', id: sale.id, label: sale.number }, branchId: branch.id, amount: quote.total, currency: branch.currency });
    const manual = quote.lines.reduce((sum, line) => sum + line.manualDiscount + line.orderDiscount, 0);
    if (manual > 0) {
      const percent = (manual / Math.max(quote.subtotal, 1)) * 100;
      const large = percent > db.settings.flagRules.discountAbovePercent;
      logActivity({ action: 'discount', target: { type: 'sale', id: sale.id, label: sale.number }, branchId: branch.id, amount: roundMoney(manual), currency: branch.currency, flagged: large, alerted: large, changes: [{ field: 'discount', from: 0, to: `${Math.round(percent)}%` }] });
      // Above the limit in Activity › Flag settings: the owners and the branch's managers get an alert.
      if (large) alertLargeAmount({ kind: 'discount', branch: branch.name, amount: `${branch.currency} ${roundMoney(manual)}`, user: actor().name }, branch.id);
    }
    alertLowStock(branch, [...wanted.keys()]);
    return sale;
  });

// After a sale, tell the branch's staff (and the owners) about items that are now low.
const alertLowStock = (branch: Branch, variantIds: Id[]) => {
  const index = variantIndex(db);
  const staff = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.branchIds.includes(branch.id) && !user.brandId).map((user) => user.id);
  variantIds.forEach((variantId) => {
    const left = availableIn(db, variantId, branch.id);
    const minimum = db.minQty[`${variantId}|${branch.id}`] ?? db.settings.lowStockDefault;
    const entry = index.get(variantId);
    if (!entry || left > minimum) return;
    const params = { product: `${entry.product.name} ${entry.variant.size}`, branch: branch.name, qty: String(left), min: String(minimum) };
    notify('lowStock', params, toPath(routes.owner.itemHistory, { variantId }), [], true);
    notifyUsers('lowStock', params, toPath(routes.cashier.stockItem, { productId: entry.product.id }), staff);
  });
};

// ---- Sales on hold ---------------------------------------------------------------------------------------------

export const listHeldSales = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const me = actor();
    const index = variantIndex(db);
    return db.heldSales
      .filter((held) => held.branchId === branchId && held.cashierId === me.id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((held) => ({ ...held, pieces: held.items.reduce((sum, item) => sum + item.qty, 0), names: held.items.map((item) => index.get(item.variantId)?.product.name ?? '').join(', ') }));
  });

export const holdSale = (input: CartInput & { customer?: { name: string; phone: string; age?: string } }) =>
  mutate((): HeldSale => {
    assertBranch(input.branchId);
    const me = actor();
    const held: HeldSale = { id: newId(), number: nextNumber('H', 4), branchId: input.branchId, cashierId: me.id, at: nowIso(), customer: input.customer?.name || input.customer?.phone ? input.customer : undefined, items: input.items, orderDiscount: input.orderDiscount, promoCode: input.promoCode };
    // A customer with a name and a full phone number is saved now, so they can be found before the sale is paid.
    if (input.customer?.name.trim() && phoneDigits(input.customer.phone).length >= tillDefaults.phoneDigits) customerFor(input.customer.name, input.customer.phone, input.customer.age);
    db.heldSales.push(held);
    logActivity({ action: 'create', target: { type: 'heldSale', id: held.id, label: held.number }, branchId: input.branchId });
    return held;
  });

// Resuming takes the sale off hold (it goes back on hold if the cashier holds it again).
export const takeHeldSale = (heldSaleId: Id, cancel = false) =>
  mutate(() => {
    const held = findById(db.heldSales, heldSaleId);
    if (held.cashierId !== actor().id) throw new ApiError('notAllowed');
    db.heldSales = db.heldSales.filter((current) => current.id !== heldSaleId);
    logActivity({ action: cancel ? 'delete' : 'restore', target: { type: 'heldSale', id: held.id, label: held.number }, branchId: held.branchId });
    return held;
  });

// Cancelling a sale before payment: nothing was sold, but it is logged with what was in the cart.
export const logCancelledSale = (branchId: Id, skus: string[]) =>
  mutate(() => {
    assertBranch(branchId);
    logActivity({ action: 'delete', target: { type: 'heldSale', id: newId(), label: skus.join(', ') }, branchId });
    return true;
  });
