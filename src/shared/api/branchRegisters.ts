import type { CashCheck, Id, IsoDate, Shift } from '@/shared/types';
import { addDays, inRange, nowIso, saleTotal, toIsoDate, today } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole } from './branchScope';
import { actor, db, findById, isOwner, logActivity, mutate, newId, notify, respond } from './server';

// Registers (tills) of a branch for its manager: who is on each one, the cash it should hold, cash checks at any
// time, closing a register for a cashier, the difference at closing with a note, approving the closing, and the
// day's closing report per payment method. Takings only, never cost or profit.

const isCash = (methodId: Id) => db.settings.paymentMethods.find((method) => method.id === methodId)?.kind === 'cash';

const assertManager = (branchId: Id) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !hasRole(me, 'manager')) throw new ApiError('notAllowed');
  return me;
};

// The cash a register should hold: its opening float, plus cash taken by its cashier while it was open, minus cash
// given back for returns.
export const expectedCashOf = (shift: Shift, until: string = shift.closedAt ?? nowIso()) => {
  const within = (at: string) => at >= shift.openedAt && at <= until;
  const taken = db.sales
    .filter((sale) => sale.branchId === shift.branchId && sale.cashierId === shift.cashierId && !sale.voidedAt && within(sale.at))
    .reduce((sum, sale) => sum + sale.payments.filter((payment) => isCash(payment.methodId)).reduce((total, payment) => total + payment.amount, 0), 0);
  const given = db.returns
    .filter((saleReturn) => saleReturn.branchId === shift.branchId && saleReturn.byId === shift.cashierId && within(saleReturn.at))
    .reduce((sum, saleReturn) => sum + saleReturn.refunds.filter((refund) => isCash(refund.methodId)).reduce((total, refund) => total + refund.amount, 0), 0);
  return Math.round((shift.openingCash + taken - given) * 100) / 100;
};

export interface RegisterView {
  shift: Shift;
  open: boolean;
  expected: number;
  difference: number | null; // counted minus expected, once counted
  checks: CashCheck[];
}

const toView = (shift: Shift): RegisterView => {
  const expected = shift.closedAt ? (shift.expectedCash ?? expectedCashOf(shift)) : expectedCashOf(shift);
  return {
    shift,
    open: !shift.closedAt,
    expected,
    difference: shift.countedCash === undefined ? null : Math.round((shift.countedCash - expected) * 100) / 100,
    checks: db.cashChecks.filter((check) => check.shiftId === shift.id).sort((a, b) => b.at.localeCompare(a.at)),
  };
};

// Open registers, and the ones closed in the last week (newest first).
export const listRegisters = (branchId: Id) =>
  respond(() => {
    assertManager(branchId);
    const since = addDays(today(), -7);
    return db.shifts
      .filter((shift) => shift.branchId === branchId && (!shift.closedAt || toIsoDate(shift.closedAt) >= since))
      .sort((a, b) => Number(Boolean(a.closedAt)) - Number(Boolean(b.closedAt)) || b.openedAt.localeCompare(a.openedAt))
      .map(toView);
  });

// Counts the cash in a register at any time and records it against what the system expects.
export const checkCash = (shiftId: Id, counted: number, note?: string) =>
  mutate(() => {
    const shift = findById(db.shifts, shiftId);
    const me = assertManager(shift.branchId);
    if (shift.closedAt) throw new ApiError('alreadyDecided');
    if (!(counted >= 0)) throw new ApiError('notAllowed');
    const check: CashCheck = { id: newId(), branchId: shift.branchId, shiftId, at: nowIso(), byId: me.id, currency: shift.currency, expected: expectedCashOf(shift), counted, note };
    db.cashChecks.push(check);
    const difference = counted - check.expected;
    logActivity({ action: 'update', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, amount: difference, currency: shift.currency, flagged: difference !== 0 });
    return check;
  });

// Closes a register for its cashier with the cash counted. A difference is recorded and the owners are told.
export const closeRegister = (shiftId: Id, countedCash: number, note?: string) =>
  mutate(() => {
    const shift = findById(db.shifts, shiftId);
    const me = assertManager(shift.branchId);
    if (shift.closedAt) throw new ApiError('alreadyDecided');
    if (!(countedCash >= 0)) throw new ApiError('notAllowed');
    const closedAt = nowIso();
    const expectedCash = expectedCashOf(shift, closedAt);
    Object.assign(shift, { closedAt, closedById: me.id, expectedCash, countedCash, note: note || shift.note });
    const difference = Math.round((countedCash - expectedCash) * 100) / 100;
    if (difference !== 0) {
      notify('cashDifference', { branch: findById(db.branches, shift.branchId).name, register: shift.register, amount: `${shift.currency} ${difference}` }, '/owner/reports/shifts');
    }
    logActivity({ action: difference ? 'cashDifference' : 'update', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, amount: difference, currency: shift.currency, flagged: difference !== 0 });
    return toView(shift);
  });

// Explains a cash difference on a closed register.
export const noteCashDifference = (shiftId: Id, note: string) =>
  mutate(() => {
    const shift = findById(db.shifts, shiftId);
    assertManager(shift.branchId);
    if (!shift.closedAt || !note.trim()) throw new ApiError('notAllowed');
    const before = shift.note ?? null;
    shift.note = note.trim();
    logActivity({ action: 'update', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, changes: [{ field: 'note', from: before, to: shift.note }] });
    return toView(shift);
  });

// Approves a closed register and its cash difference. A difference needs a note explaining it first.
export const approveShiftClosing = (shiftId: Id, reasonId: string) =>
  mutate(() => {
    const shift = findById(db.shifts, shiftId);
    const me = assertManager(shift.branchId);
    if (!shift.closedAt || shift.approvedById) throw new ApiError('alreadyDecided');
    if (!reasonId) throw new ApiError('missingReason');
    const difference = (shift.countedCash ?? 0) - (shift.expectedCash ?? 0);
    if (difference !== 0 && !shift.note) throw new ApiError('missingReason');
    Object.assign(shift, { approvedById: me.id, approvedAt: nowIso(), approvalReason: reasonId });
    logActivity({ action: 'approve', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, amount: difference, currency: shift.currency });
    return toView(shift);
  });

// The day's closing report: sales and refunds for each payment method, and the cash counted at every register.
export const getDailyClosing = (branchId: Id, day: IsoDate) =>
  respond(() => {
    const branch = assertBranch(branchId);
    assertManager(branchId);
    const range = { from: day, to: day };
    const sales = db.sales.filter((sale) => sale.branchId === branchId && !sale.voidedAt && inRange(sale.at, range));
    const returns = db.returns.filter((saleReturn) => saleReturn.branchId === branchId && inRange(saleReturn.at, range));
    const byMethod = new Map<Id, { taken: number; refunded: number; payments: number }>();
    const row = (methodId: Id) => byMethod.get(methodId) ?? (byMethod.set(methodId, { taken: 0, refunded: 0, payments: 0 }), byMethod.get(methodId)!);
    sales.forEach((sale) =>
      sale.payments.forEach((payment) => {
        const current = row(payment.methodId);
        current.taken += payment.amount;
        current.payments += 1;
      }),
    );
    returns.forEach((saleReturn) => saleReturn.refunds.forEach((refund) => (row(refund.methodId).refunded += refund.amount)));
    const shifts = db.shifts.filter((shift) => shift.branchId === branchId && toIsoDate(shift.openedAt) === day).map(toView);
    return {
      currency: branch.currency,
      day,
      sales: sales.length,
      gross: sales.reduce((sum, sale) => sum + saleTotal(sale), 0),
      methods: [...byMethod.entries()].map(([methodId, totals]) => ({ methodId, ...totals, net: totals.taken - totals.refunded })),
      registers: shifts,
    };
  });
