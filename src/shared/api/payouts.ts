import type { BrandPaymentMethod, CurrencyCode, Id, IsoDate } from '@/shared/types';
import { currentTerms, nowIso, today, type DateRange } from '@/shared/utils';
import { ApiError } from './errors';
import { resolveApprovals } from './costing';
import { buildStatement, computeTotals, feeDueDate, feeState, statementItems } from './settlement';
import { actor, db, findById, logActivity, mutate, newId, nextNumber, notify, respond } from './server';

const sinceStart: IsoDate = '2000-01-01';

// Brands that are paid out: commission brands, and any brand with monthly fees.
const payoutBrands = () => db.brands.filter((brand) => currentTerms(brand).model === 'commission' || db.fees.some((fee) => fee.brandId === brand.id));

const paidFor = (statementId: Id) => db.brandPayments.filter((payment) => payment.statementId === statementId).reduce((sum, payment) => sum + payment.amount, 0);

// What isn't on any statement yet, up to today: sales, returns, fees and anything carried over.
const unsettled = (brandId: Id) => {
  const brand = findById(db.brands, brandId);
  const currency = currentTerms(brand).payoutCurrency;
  const lastEnd = db.statements.filter((statement) => statement.brandId === brandId).map((statement) => statement.periodEnd).sort().at(-1);
  const range: DateRange = { from: lastEnd ? nextDay(lastEnd) : sinceStart, to: today() };
  const items = statementItems(db, brandId, { from: sinceStart, to: today() }, currency);
  return { range, currency, items, totals: computeTotals(db, brand, range, items, currency) };
};

const nextDay = (date: IsoDate) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
};

// Alerts for monthly fees that became due, once per fee.
const alertDueFees = () => {
  const dueDay = db.settings.feeDueDay;
  db.fees.forEach((fee) => {
    if (feeState(fee, dueDay) === 'paid' || feeState(fee, dueDay) === 'upcoming') return;
    if (db.notifications.some((item) => item.kind === 'brandPaymentDue' && item.params.feeId === fee.id)) return;
    const brand = db.brands.find((current) => current.id === fee.brandId);
    if (brand && !currentTerms(brand).deductFeeFromPayout) {
      notify('brandPaymentDue', { feeId: fee.id, brand: brand.name, what: 'fee', amount: `${fee.currency} ${fee.amount}`, date: feeDueDate(fee, dueDay) }, `/owner/payouts/${brand.id}?tab=fees`);
    }
  });
};

export interface BrandBalance {
  brandId: Id;
  currency: CurrencyCode;
  balance: number; // positive: the store owes the brand; negative: the brand owes the store
  unsettled: number;
  approvedUnpaid: number;
  feesOverdue: number;
  lastPaymentAt?: string;
  soldUnits: number; // since the last statement
}

export const getBrandBalances = () =>
  respond((): BrandBalance[] => {
    alertDueFees();
    return payoutBrands()
      .map((brand) => {
        const open = unsettled(brand.id);
        const approvedUnpaid = db.statements
          .filter((statement) => statement.brandId === brand.id && statement.status === 'approved')
          .reduce((sum, statement) => sum + statement.totals.amountDue - paidFor(statement.id), 0);
        const lastPayment = db.brandPayments.filter((payment) => payment.brandId === brand.id).sort((a, b) => b.date.localeCompare(a.date))[0];
        return {
          brandId: brand.id,
          currency: open.currency,
          unsettled: open.totals.amountDue,
          approvedUnpaid,
          balance: open.totals.amountDue + approvedUnpaid,
          feesOverdue: db.fees.filter((fee) => fee.brandId === brand.id && feeState(fee, db.settings.feeDueDay) === 'overdue').length,
          lastPaymentAt: lastPayment?.date,
          soldUnits: open.totals.soldUnits,
        };
      })
      .sort((a, b) => b.balance - a.balance);
  });

export const getBrandPayouts = (brandId: Id) =>
  respond(() => {
    const brand = findById(db.brands, brandId);
    const open = unsettled(brandId);
    const dueDay = db.settings.feeDueDay;
    return {
      brand,
      terms: currentTerms(brand),
      unsettled: { range: open.range, totals: open.totals, currency: open.currency, itemCount: open.items.length },
      statements: db.statements
        .filter((statement) => statement.brandId === brandId)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
        .map((statement) => ({ statement, paid: paidFor(statement.id) })),
      payments: db.brandPayments.filter((payment) => payment.brandId === brandId).sort((a, b) => b.date.localeCompare(a.date)),
      fees: db.fees
        .filter((fee) => fee.brandId === brandId)
        .sort((a, b) => b.month.localeCompare(a.month))
        .map((fee) => ({ fee, state: feeState(fee, dueDay), dueDate: feeDueDate(fee, dueDay) })),
    };
  });

const overlapsLocked = (brandId: Id, range: DateRange) =>
  db.statements.some((statement) => statement.brandId === brandId && statement.locked && statement.periodStart <= range.to && statement.periodEnd >= range.from);

// Generates a statement for a period from everything not on another statement. It starts as a draft; an owner
// approves it before it can be paid.
export const createStatement = (brandId: Id, range: DateRange) =>
  mutate(() => {
    if (overlapsLocked(brandId, range)) throw new ApiError('periodLocked');
    const brand = findById(db.brands, brandId);
    const statement = buildStatement(db, brand, range, { id: newId(), number: nextNumber('ST', 4), byId: actor().id, at: nowIso() });
    db.statements.push(statement);
    db.approvals.push({ id: newId(), kind: 'payout', level: 'owner', requestedById: actor().id, at: nowIso(), amount: statement.totals.amountDue, currency: statement.currency, ref: { type: 'statement', id: statement.id }, summary: `${brand.name} · ${statement.number}`, status: 'pending' });
    logActivity({ action: 'create', target: { type: 'statement', id: statement.id, label: `${brand.name} ${statement.number}` }, amount: statement.totals.amountDue, currency: statement.currency });
    return statement;
  });

export const deleteDraftStatement = (statementId: Id) =>
  mutate(() => {
    const statement = findById(db.statements, statementId);
    if (statement.status !== 'draft') throw new ApiError('notAllowed');
    db.statements = db.statements.filter((current) => current.id !== statementId);
    resolveApprovals('statement', statementId, false);
    logActivity({ action: 'delete', target: { type: 'statement', id: statementId, label: statement.number } });
    return true;
  });

export const decideStatement = (statementId: Id, approve: boolean, reason?: string) =>
  mutate(() => {
    const statement = findById(db.statements, statementId);
    if (statement.status !== 'draft') throw new ApiError('alreadyDecided');
    const brand = findById(db.brands, statement.brandId);
    if (approve) {
      // Recalculated at approval, so it matches the data at that moment.
      const items = statementItems(db, brand.id, { from: statement.periodStart, to: statement.periodEnd }, statement.currency, { saleLineIds: statement.saleLineIds, returnLineIds: statement.returnLineIds });
      statement.totals = computeTotals(db, brand, { from: statement.periodStart, to: statement.periodEnd }, items, statement.currency, statement.id);
      statement.status = 'approved';
      statement.approvedById = actor().id;
      // Fees taken out of this payout are now settled.
      db.fees
        .filter((fee) => fee.brandId === brand.id && !fee.paidAt && !fee.deductedInStatementId && `${fee.month}-01` <= statement.periodEnd && currentTerms(brand).deductFeeFromPayout)
        .forEach((fee) => (fee.deductedInStatementId = statement.id));
    } else {
      db.statements = db.statements.filter((current) => current.id !== statementId);
    }
    resolveApprovals('statement', statementId, approve, reason);
    logActivity({ action: approve ? 'approve' : 'reject', target: { type: 'statement', id: statementId, label: `${brand.name} ${statement.number}` }, amount: statement.totals.amountDue, currency: statement.currency });
    return statement;
  });

export interface PaymentInput {
  brandId: Id;
  date: IsoDate;
  amount: number;
  currency: CurrencyCode;
  method: BrandPaymentMethod;
  reference: string;
  statementId?: Id;
}

// A payment to a brand. Paying an approved statement in full marks it paid.
export const recordBrandPayment = (input: PaymentInput) =>
  mutate(() => {
    const brand = findById(db.brands, input.brandId);
    if (input.statementId) {
      const statement = findById(db.statements, input.statementId);
      if (statement.status === 'draft') throw new ApiError('notAllowed');
    }
    const payment = { id: newId(), ...input, byId: actor().id, at: nowIso() };
    db.brandPayments.push(payment);
    if (input.statementId) {
      const statement = findById(db.statements, input.statementId);
      if (paidFor(statement.id) >= statement.totals.amountDue - 0.01) {
        statement.status = 'paid';
        statement.paymentId = payment.id;
      }
    }
    logActivity({ action: 'pay', target: { type: 'payment', id: payment.id, label: brand.name }, amount: input.amount, currency: input.currency });
    return payment;
  });

// A locked statement's period can't change: no new statement can cover it, and terms can't change inside it.
// Returns made later are carried into the next statement.
export const lockStatement = (statementId: Id) =>
  mutate(() => {
    const statement = findById(db.statements, statementId);
    if (statement.status === 'draft') throw new ApiError('notAllowed');
    statement.locked = true;
    logActivity({ action: 'lock', target: { type: 'statement', id: statementId, label: statement.number } });
    return statement;
  });

export const getStatement = (statementId: Id) =>
  respond(() => {
    const statement = findById(db.statements, statementId);
    const brand = findById(db.brands, statement.brandId);
    const items = statementItems(db, brand.id, { from: statement.periodStart, to: statement.periodEnd }, statement.currency, { saleLineIds: statement.saleLineIds, returnLineIds: statement.returnLineIds });
    const productName = new Map(db.products.map((product) => [product.id, product.name]));
    const variantLabel = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, `${variant.size} · ${variant.color}`] as const)));
    return {
      statement,
      brand,
      items: items.map((item) => ({ ...item, productName: productName.get(item.productId) ?? '', variantLabel: variantLabel.get(item.variantId) ?? '' })),
      payments: db.brandPayments.filter((payment) => payment.statementId === statementId),
      paid: paidFor(statementId),
      fees: db.fees.filter((fee) => fee.deductedInStatementId === statementId),
    };
  });

// A monthly fee the brand paid separately.
export const recordFeePayment = (feeId: Id) =>
  mutate(() => {
    const fee = findById(db.fees, feeId);
    fee.paidAt = nowIso();
    logActivity({ action: 'pay', target: { type: 'fee', id: fee.id, label: fee.month }, amount: fee.amount, currency: fee.currency });
    return fee;
  });

// Commission per sale of a brand in a period (for the payouts page's sales tab).
export const getBrandSales = (brandId: Id, range: DateRange) =>
  respond(() => {
    const brand = findById(db.brands, brandId);
    const items = statementItems(db, brandId, range, currentTerms(brand).payoutCurrency, undefined, true);
    return { currency: currentTerms(brand).payoutCurrency, items };
  });
