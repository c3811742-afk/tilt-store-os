import { routes } from '@/shared/constants';
import type { ApprovalKind, ApprovalLevel, ApprovalRequest, Id, Sale, User } from '@/shared/types';
import { nowIso, saleTotal } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole } from './branchScope';
import { decideBranchCount } from './counts';
import { describeVariant } from './stock';
import { decideTransfer } from './transfers';
import { actor, db, findById, isOwner, logActivity, mutate, newId, notify, respond } from './server';

// Approvals for a branch manager: requests from the till (discounts, refunds, price changes, returns outside the
// policy or without a receipt, voids) and from the branch (transfers out, stock counts). At the till the manager (or
// an owner) approves on the spot with their personal approval PIN; otherwise the till sends the request to their
// phone and they decide on the Approvals page. They never approve their own sale,
// discount or refund, and anything above their limit goes to the owner. Every decision keeps who, when and why.

export type BlockedReason = 'ownRequest' | 'aboveLimit';

export interface ApprovalView {
  approval: ApprovalRequest;
  blocked?: BlockedReason; // why this manager can't decide it
}

// Who must approve a till request: the owner above the manager's discount limit or above the refund amount in
// Policies, the branch manager otherwise. Worked out here, so a till can't ask for a lower level than it needs.
export const requiredApprovalLevel = (request: { kind: ApprovalKind; percent?: number; amount?: number; level?: ApprovalLevel }): ApprovalLevel => {
  const { discountLimits, ownerApprovalAbove } = db.settings;
  if (request.level === 'owner') return 'owner';
  if (request.kind === 'discount' && (request.percent ?? 0) > discountLimits.manager) return 'owner';
  if ((request.kind === 'refund' || request.kind === 'returnWithoutReceipt' || request.kind === 'returnOutsidePolicy') && (request.amount ?? 0) > ownerApprovalAbove) return 'owner';
  return 'manager';
};

// Why a manager can't decide a request, if they can't.
const blockedFor = (approval: ApprovalRequest, me: User): BlockedReason | undefined => {
  if (approval.requestedById === me.id && approval.kind !== 'transfer' && approval.kind !== 'stockCount') return 'ownRequest';
  if (requiredApprovalLevel({ kind: approval.kind, percent: approval.percent, amount: approval.amount }) === 'owner') return 'aboveLimit';
  if (approval.kind === 'stockCount') {
    const count = db.counts.find((current) => current.id === approval.ref?.id);
    if (count && count.lines.reduce((sum, line) => sum + Math.abs(line.counted - line.expected), 0) > db.settings.stockCountApprovalAbove) return 'aboveLimit';
  }
  return undefined;
};

const assertManagerOf = (branchId: Id | undefined, user: User = actor()) => {
  if (!branchId) throw new ApiError('notAllowed');
  assertBranch(branchId, user);
  if (!isOwner(user) && !hasRole(user, 'manager')) throw new ApiError('notAllowed');
  return user;
};

// The manager-level requests of a branch: the ones waiting, and every decided one (the approvals log).
export const listBranchApprovals = (branchId: Id) =>
  respond(() => {
    const me = assertManagerOf(branchId);
    const list = db.approvals.filter((approval) => approval.branchId === branchId && approval.level === 'manager').sort((a, b) => b.at.localeCompare(a.at));
    return {
      waiting: list.filter((approval) => approval.status === 'pending').map((approval): ApprovalView => ({ approval, blocked: blockedFor(approval, me) })),
      log: list.filter((approval) => approval.status !== 'pending').map((approval): ApprovalView => ({ approval })),
    };
  });

// Applies a decision once every rule is checked. Requests about a record go to that record's own rules.
const decide = async (approvalId: Id, approve: boolean, reasonId: string, note: string | undefined, channel: NonNullable<ApprovalRequest['channel']>) => {
  const approval = findById(db.approvals, approvalId);
  const me = actor();
  assertManagerOf(approval.branchId, me);
  if (approval.status !== 'pending') throw new ApiError('alreadyDecided');
  if (!reasonId) throw new ApiError('missingReason');
  const blocked = blockedFor(approval, me);
  if (blocked === 'ownRequest') throw new ApiError('ownRequest');
  if (blocked === 'aboveLimit') throw new ApiError('notAllowed');
  if (approval.kind === 'transfer') return decideTransfer(approval.ref?.id ?? '', approve, reasonId, note);
  if (approval.kind === 'stockCount') return decideBranchCount(approval.ref?.id ?? '', approve, reasonId);
  return mutate(() => {
    const current = findById(db.approvals, approvalId);
    Object.assign(current, { status: approve ? 'approved' : 'rejected', decidedById: me.id, decidedAt: nowIso(), reason: reasonId, note, channel });
    logActivity({ action: approve ? 'approve' : 'reject', target: { type: 'approval', id: current.id, label: current.summary }, branchId: current.branchId, amount: current.amount, currency: current.currency, userId: me.id, flagged: true });
    // The cashier who asked is told either way (the till may be waiting for the answer).
    notify(approve ? 'approvalApproved' : 'approvalRejected', { summary: current.summary, user: me.name, reason: reasonId }, routes.notifications, [current.requestedById]);
    return current;
  });
};

// Decides in the app, at the desk or from the manager's phone.
export const decideBranchApproval = (approvalId: Id, approve: boolean, reasonId: string, note?: string) => decide(approvalId, approve, reasonId, note, 'phone');

// The signed-in manager sets or changes their own approval PIN (4 digits). Changing it needs the current one.
export const setOwnApprovalPin = (currentPin: string, nextPin: string) =>
  mutate(() => {
    const me = actor();
    if (!hasRole(me, 'manager') && !isOwner(me)) throw new ApiError('notAllowed');
    if (!/^\d{4}$/.test(nextPin)) throw new ApiError('notAllowed');
    if (me.approvalPinLocked) throw new ApiError('approvalPinLocked');
    if (me.approvalPin && me.approvalPin !== currentPin) throw new ApiError('wrongApprovalPin');
    me.approvalPin = nextPin;
    me.approvalPinFails = 0;
    logActivity({ action: 'update', target: { type: 'user', id: me.id, label: me.name }, changes: [{ field: 'approvalPin', from: null, to: '••••' }] });
    return { hasPin: true };
  });

export const getOwnPinState = () =>
  respond(() => {
    const me = actor();
    return { hasPin: Boolean(me.approvalPin), locked: Boolean(me.approvalPinLocked) };
  });

// ---- Voiding a sale ---------------------------------------------------------------------------------------------

export interface SaleLookup {
  sale: Pick<Sale, 'id' | 'number' | 'at' | 'cashierId' | 'currency' | 'voidedAt' | 'voidedById' | 'voidReasonId' | 'voidNote'>;
  total: number;
  lines: { id: Id; productName: string; size: string; color: string; qty: number; amount: number }[];
}

// Finds a completed sale of the branch by its number (e.g. S-003557). Selling prices only, no cost.
export const findBranchSale = (branchId: Id, number: string) =>
  respond((): SaleLookup => {
    assertManagerOf(branchId);
    const wanted = number.trim().toUpperCase();
    const sale = db.sales.find((current) => current.branchId === branchId && current.number.toUpperCase() === wanted);
    if (!sale) throw new ApiError('notFound');
    return {
      sale: { id: sale.id, number: sale.number, at: sale.at, cashierId: sale.cashierId, currency: sale.currency, voidedAt: sale.voidedAt, voidedById: sale.voidedById, voidReasonId: sale.voidReasonId, voidNote: sale.voidNote },
      total: saleTotal(sale),
      lines: sale.lines.map((line) => {
        const info = describeVariant(line.variantId);
        return { id: line.id, productName: info.productName, size: info.size, color: info.color, qty: line.qty, amount: line.unitPrice * line.qty - line.discount };
      }),
    };
  });

// Voids a sale with a reason. The sale is never edited or deleted: it is marked void (so reports leave it out) and
// each piece goes back to where it was sold from with a reversal movement. A manager can't void their own sale.
export const voidSale = (saleId: Id, reasonId: string, note?: string) =>
  mutate(() => {
    const sale = findById(db.sales, saleId);
    const me = assertManagerOf(sale.branchId);
    if (sale.voidedAt) throw new ApiError('alreadyDecided');
    if (sale.cashierId === me.id) throw new ApiError('ownRequest');
    if (!reasonId) throw new ApiError('missingReason');
    if (db.returns.some((saleReturn) => saleReturn.saleId === sale.id)) throw new ApiError('notAllowed');
    const at = nowIso();
    db.movements
      .filter((movement) => movement.kind === 'sale' && movement.ref?.id === sale.id && movement.from)
      .forEach((movement) => db.movements.push({ id: newId(), at, byId: me.id, variantId: movement.variantId, qty: movement.qty, to: movement.from, kind: 'return', ref: { type: 'sale', id: sale.id }, reason: 'void' }));
    Object.assign(sale, { voidedAt: at, voidedById: me.id, voidReasonId: reasonId, voidNote: note });
    db.approvals.push({ id: newId(), kind: 'void', level: 'manager', status: 'approved', branchId: sale.branchId, requestedById: me.id, at, ref: { type: 'sale', id: sale.id }, summary: sale.number, amount: saleTotal(sale), currency: sale.currency, decidedById: me.id, decidedAt: at, reason: reasonId, note, channel: 'app' });
    logActivity({ action: 'void', target: { type: 'sale', id: sale.id, label: sale.number }, branchId: sale.branchId, amount: saleTotal(sale), currency: sale.currency, flagged: true });
    return sale;
  });

