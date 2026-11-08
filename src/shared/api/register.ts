import { routes, tillDefaults } from '@/shared/constants';
import type { CashMove, Id, Shift } from '@/shared/types';
import { nowIso, roundMoney } from '@/shared/utils';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, logActivity, mutate, newId, notify, respond } from './server';
import { openShiftOf } from './till';
import { assertBranch } from './branchScope';

// The cashier's shift: opening with a cash count, cash in and out, and closing with the count and the card
// machine's total. Everything is in the branch's currency.

const methodIdsOf = (kind: 'cash' | 'card') => db.settings.paymentMethods.filter((method) => method.kind === kind).map((method) => method.id);
const isCash = (methodId: Id) => methodIdsOf('cash').includes(methodId);

const inShift = (shift: Shift, until: string) => (at: string, byId: Id, branchId: Id) => branchId === shift.branchId && byId === shift.cashierId && at >= shift.openedAt && at <= until;

// The cash a register should hold at `until` (now, or when it closed): its opening float, plus cash taken by its
// cashier while it was open, minus cash given back for returns, plus cash added to the drawer, minus cash taken out.
// The cashier's shift screen and the manager's registers both use it.
export const expectedCashOf = (shift: Shift, until: string = shift.closedAt ?? nowIso()) => {
  const within = inShift(shift, until);
  const cash = (list: { methodId: Id; amount: number }[]) => list.filter((item) => isCash(item.methodId)).reduce((total, item) => total + item.amount, 0);
  const taken = db.sales.filter((sale) => !sale.voidedAt && within(sale.at, sale.cashierId, sale.branchId)).reduce((sum, sale) => sum + cash(sale.payments), 0);
  const given = db.returns.filter((saleReturn) => within(saleReturn.at, saleReturn.byId, saleReturn.branchId)).reduce((sum, saleReturn) => sum + cash(saleReturn.refunds), 0);
  const moved = (shift.cashMoves ?? []).filter((move) => move.at <= until).reduce((sum, move) => sum + (move.kind === 'in' ? move.amount : -move.amount), 0);
  return roundMoney(shift.openingCash + taken - given + moved);
};

export interface ShiftSummary {
  shift: Shift;
  branchName: string;
  cashierName: string;
  deviceName?: string;
  sales: number; // completed sales in the shift
  pieces: number;
  salesTotal: number;
  refundsTotal: number;
  cashSales: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number; // opening cash + cash sales - cash refunds + cash in - cash out
  cardTotal: number; // card payments minus card refunds: what the card machine should show
  byMethod: { methodId: Id; amount: number }[];
}

// The figures of a shift, from the sales and returns its cashier recorded in its branch while it was open.
export const summarizeShift = (shift: Shift): ShiftSummary => {
  const within = inShift(shift, shift.closedAt ?? nowIso());
  const sales = db.sales.filter((sale) => !sale.voidedAt && within(sale.at, sale.cashierId, sale.branchId));
  const returns = db.returns.filter((saleReturn) => within(saleReturn.at, saleReturn.byId, saleReturn.branchId));
  const payments = sales.flatMap((sale) => sale.payments);
  const refunds = returns.flatMap((saleReturn) => saleReturn.refunds);
  const sum = (list: { methodId: Id; amount: number }[], ids: Id[]) => roundMoney(list.filter((item) => ids.includes(item.methodId)).reduce((total, item) => total + item.amount, 0));
  const moves = shift.cashMoves ?? [];
  const cashIn = roundMoney(moves.filter((move) => move.kind === 'in').reduce((total, move) => total + move.amount, 0));
  const cashOut = roundMoney(moves.filter((move) => move.kind === 'out').reduce((total, move) => total + move.amount, 0));
  const cashSales = sum(payments, methodIdsOf('cash'));
  const cashRefunds = sum(refunds, methodIdsOf('cash'));
  const byMethod = new Map<Id, number>();
  payments.forEach((payment) => byMethod.set(payment.methodId, roundMoney((byMethod.get(payment.methodId) ?? 0) + payment.amount)));
  return {
    shift,
    branchName: db.branches.find((branch) => branch.id === shift.branchId)?.name ?? '',
    cashierName: db.users.find((user) => user.id === shift.cashierId)?.name ?? '',
    deviceName: db.devices.find((device) => device.id === shift.deviceId)?.name,
    sales: sales.length,
    pieces: sales.reduce((total, sale) => total + sale.lines.reduce((count, line) => count + line.qty, 0), 0),
    salesTotal: roundMoney(payments.reduce((total, payment) => total + payment.amount, 0)),
    refundsTotal: roundMoney(refunds.reduce((total, refund) => total + refund.amount, 0)),
    cashSales,
    cashRefunds,
    cashIn,
    cashOut,
    expectedCash: expectedCashOf(shift),
    cardTotal: roundMoney(sum(payments, methodIdsOf('card')) - sum(refunds, methodIdsOf('card'))),
    byMethod: [...byMethod].map(([methodId, amount]) => ({ methodId, amount })),
  };
};

// The signed-in cashier's open shift in a branch (null when it isn't open yet), and the branch's tills.
export const getMyShift = (branchId: Id) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const shift = openShiftOf(branch.id, actor().id);
    return {
      summary: shift ? summarizeShift(shift) : null,
      devices: db.devices.filter((device) => device.branchId === branch.id).map((device) => ({ id: device.id, name: device.name })),
      currency: branch.currency,
    };
  });

export interface CountInput {
  count: Record<string, number>; // note or coin value -> how many
  total: number;
}

// Opens a shift with the cash counted in the drawer. Saves who opened it and when.
export const openShift = (branchId: Id, deviceId: Id | undefined, opening: CountInput) =>
  mutate(() => {
    const branch = assertBranch(branchId);
    const me = actor();
    if (openShiftOf(branch.id, me.id)) throw new ApiError('shiftAlreadyOpen');
    const device = db.devices.find((current) => current.id === deviceId && current.branchId === branch.id);
    const shift: Shift = {
      id: newId(),
      branchId: branch.id,
      register: device?.name ?? tillDefaults.register,
      deviceId: device?.id,
      cashierId: me.id,
      openedAt: nowIso(),
      currency: branch.currency,
      openingCash: roundMoney(opening.total),
      openingCount: opening.count,
      cashMoves: [],
    };
    db.shifts.push(shift);
    logActivity({ action: 'create', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: branch.id, amount: shift.openingCash, currency: shift.currency });
    return summarizeShift(shift);
  });

const myOpenShift = (shiftId: Id) => {
  const shift = findById(db.shifts, shiftId);
  if (shift.cashierId !== actor().id || shift.closedAt) throw new ApiError('shiftClosed');
  return shift;
};

// Cash added to or taken out of the drawer, with a reason.
export const addCashMove = (shiftId: Id, move: Pick<CashMove, 'kind' | 'amount' | 'reasonId' | 'note'>) =>
  mutate(() => {
    const shift = myOpenShift(shiftId);
    if (!(move.amount > 0)) throw new ApiError('notPaid');
    if (!db.settings.lists.cashMoveReasons.some((option) => option.id === move.reasonId)) throw new ApiError('reasonRequired');
    const record: CashMove = { id: newId(), ...move, amount: roundMoney(move.amount), at: nowIso(), byId: actor().id };
    shift.cashMoves = [...(shift.cashMoves ?? []), record];
    const reason = db.settings.lists.cashMoveReasons.find((option) => option.id === move.reasonId)?.label.en ?? move.reasonId;
    logActivity({ action: 'update', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, amount: record.amount, currency: shift.currency, changes: [{ field: move.kind === 'in' ? 'cashIn' : 'cashOut', from: null, to: reason }] });
    return summarizeShift(shift);
  });

export interface CloseInput extends CountInput {
  cardCounted: number; // the card machine's end-of-day total
  note?: string;
}

// Closes the shift: the counted cash against the expected cash, the card machine against the card sales.
// Any difference needs a note, and the owners and the branch manager are told about it.
export const closeShift = (shiftId: Id, closing: CloseInput) =>
  mutate(() => {
    const shift = myOpenShift(shiftId);
    const summary = summarizeShift(shift);
    const cashDifference = roundMoney(closing.total - summary.expectedCash);
    const cardDifference = roundMoney(closing.cardCounted - summary.cardTotal);
    if ((cashDifference || cardDifference) && !closing.note?.trim()) throw new ApiError('noteRequired');
    Object.assign(shift, {
      closedAt: nowIso(),
      expectedCash: summary.expectedCash,
      countedCash: roundMoney(closing.total),
      closingCount: closing.count,
      cardExpected: summary.cardTotal,
      cardCounted: roundMoney(closing.cardCounted),
      note: closing.note?.trim() || undefined,
    });
    logActivity({ action: 'update', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, amount: shift.countedCash, currency: shift.currency, changes: [{ field: 'closed', from: null, to: shift.closedAt ?? null }] });
    if (cashDifference) {
      const branch = db.branches.find((current) => current.id === shift.branchId);
      const managers = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.roleIds.includes('role-manager') && user.branchIds.includes(shift.branchId)).map((user) => user.id);
      notify('cashDifference', { branch: branch?.name ?? '', register: shift.register, amount: `${shift.currency} ${cashDifference}` }, routes.owner.reports, managers);
      logActivity({ action: 'cashDifference', target: { type: 'shift', id: shift.id, label: shift.register }, branchId: shift.branchId, flagged: db.settings.flagRules.cashDifferences, changes: [{ field: 'cash', from: summary.expectedCash, to: shift.countedCash ?? 0 }] });
    }
    return summarizeShift(shift);
  });

// A closed or open shift's summary, for printing.
export const getShiftSummary = (shiftId: Id) =>
  respond(() => {
    const shift = findById(db.shifts, shiftId);
    assertBranch(shift.branchId);
    return summarizeShift(shift);
  });

// The signed-in cashier's sales for the open shift and for today in a branch.
export const getMySales = (branchId: Id) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const me = actor();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const shift = openShiftOf(branch.id, me.id);
    const sales = db.sales
      .filter((sale) => sale.branchId === branch.id && sale.cashierId === me.id && !sale.voidedAt && sale.at >= dayStart.toISOString())
      .sort((a, b) => b.at.localeCompare(a.at));
    const totals = (list: typeof sales) => ({
      sales: list.length,
      pieces: list.reduce((total, sale) => total + sale.lines.reduce((count, line) => count + line.qty, 0), 0),
      total: roundMoney(list.reduce((total, sale) => total + sale.payments.reduce((sum, payment) => sum + payment.amount, 0), 0)),
    });
    return {
      currency: branch.currency,
      shift: shift ? totals(sales.filter((sale) => sale.at >= shift.openedAt)) : null,
      today: totals(sales),
      list: sales.map((sale) => ({
        saleId: sale.id,
        number: sale.number,
        at: sale.at,
        customerName: db.customers.find((customer) => customer.id === sale.customerId)?.name ?? '',
        pieces: sale.lines.reduce((count, line) => count + line.qty, 0),
        total: roundMoney(sale.payments.reduce((sum, payment) => sum + payment.amount, 0)),
        methodIds: sale.payments.map((payment) => payment.methodId),
      })),
    };
  });
