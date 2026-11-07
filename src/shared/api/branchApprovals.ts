import type { ApprovalRequest, Id, Sale, User } from '@/shared/types';
import { nowIso, saleTotal } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole, notifyUsers, staffWithRole } from './branchScope';
import { decideBranchCount } from './counts';
import { describeVariant } from './stock';
import { decideTransfer } from './transfers';
import { actor, db, findById, isOwner, logActivity, mutate, newId, notify, respond } from './server';

// Approvals for a branch manager: requests from the till (discounts, refunds, price changes, returns outside the
// policy or without a receipt, voids) and from the branch (transfers out, stock counts). A manager decides in the
// app, from their phone, or at the till with their personal approval PIN. They never approve their own sale,
// discount or refund, and anything above their limit goes to the owner. Every decision keeps who, when and why.

export type BlockedReason = 'ownRequest' | 'aboveLimit';

export interface ApprovalView {
  approval: ApprovalRequest;
  blocked?: BlockedReason; // why this manager can't decide it
}

// Why a manager can't decide a request, if they can't.
const blockedFor = (approval: ApprovalRequest, me: User): BlockedReason | undefined => {
  if (approval.requestedById === me.id && approval.kind !== 'transfer' && approval.kind !== 'stockCount') return 'ownRequest';
  const { discountLimits, ownerApprovalAbove } = db.settings;
  if (approval.kind === 'discount' && (approval.percent ?? 0) > discountLimits.manager) return 'aboveLimit';
  if ((approval.kind === 'refund' || approval.kind === 'returnWithoutReceipt' || approval.kind === 'returnOutsidePolicy') && (approval.amount ?? 0) > ownerApprovalAbove) return 'aboveLimit';
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
const decide = async (approvalId: Id, approve: boolean, reasonId: string, note: string | undefined, channel: NonNullable<ApprovalRequest['channel']>, decider?: User) => {
  const approval = findById(db.approvals, approvalId);
  const me = decider ?? actor();
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
    return current;
  });
};

// Decides in the app, at the desk or from the manager's phone.
export const decideBranchApproval = (approvalId: Id, approve: boolean, reasonId: string, note?: string) => decide(approvalId, approve, reasonId, note, 'phone');

export type PinResult = { status: 'approved' } | { status: 'wrongPin'; triesLeft: number } | { status: 'locked' };

// Approves on the spot at the till: the manager picks their name and types their personal approval PIN on the
// cashier's screen. Wrong tries are counted; at the limit (Policies, 3 by default) the PIN locks until the owner
// resets it. Works whoever is signed in on the till, so the cashier's screen can use it.
export const approveWithPin = async (approvalId: Id, managerId: Id, pin: string, reasonId: string): Promise<PinResult> => {
  const check = await mutate((): PinResult | null => {
    const approval = findById(db.approvals, approvalId);
    const manager = findById(db.users, managerId);
    if (manager.status !== 'active' || !hasRole(manager, 'manager') || !approval.branchId || !manager.branchIds.includes(approval.branchId)) throw new ApiError('notAllowed');
    if (approval.kind === 'transfer' || approval.kind === 'stockCount') throw new ApiError('notAllowed'); // decided in the app, not at the till
    if (manager.approvalPinLocked) return { status: 'locked' };
    if (!manager.approvalPin || manager.approvalPin !== pin) {
      manager.approvalPinTries = (manager.approvalPinTries ?? 0) + 1;
      const limit = db.settings.approvalPinTries;
      if (manager.approvalPinTries >= limit) {
        manager.approvalPinLocked = true;
        logActivity({ action: 'lock', target: { type: 'user', id: manager.id, label: manager.name }, branchId: approval.branchId, userId: manager.id, flagged: true });
        return { status: 'locked' };
      }
      return { status: 'wrongPin', triesLeft: limit - manager.approvalPinTries };
    }
    manager.approvalPinTries = 0;
    return null;
  });
  if (check) return check;
  await decide(approvalId, true, reasonId, undefined, 'till', db.users.find((user) => user.id === managerId));
  return { status: 'approved' };
};

// The managers who can approve at the till in a branch, for the PIN dialog. Names only.
export const listBranchApprovers = (branchId: Id) =>
  respond(() => staffWithRole('manager', branchId).map((id) => ({ id, name: findById(db.users, id).name, locked: Boolean(findById(db.users, id).approvalPinLocked) })));

// The signed-in manager sets or changes their own approval PIN (4 digits). Changing it needs the current one.
export const setOwnApprovalPin = (currentPin: string, nextPin: string) =>
  mutate(() => {
    const me = actor();
    if (!hasRole(me, 'manager') && !isOwner(me)) throw new ApiError('notAllowed');
    if (!/^\d{4}$/.test(nextPin)) throw new ApiError('notAllowed');
    if (me.approvalPinLocked) throw new ApiError('pinLocked');
    if (me.approvalPin && me.approvalPin !== currentPin) throw new ApiError('wrongPin');
    me.approvalPin = nextPin;
    me.approvalPinTries = 0;
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

// ---- For the till ---------------------------------------------------------------------------------------------

export interface TillApprovalInput {
  branchId: Id;
  kind: Extract<ApprovalRequest['kind'], 'discount' | 'refund' | 'priceOverride' | 'returnOutsidePolicy' | 'returnWithoutReceipt' | 'void'>;
  summary: string; // what is asked, e.g. "25% off Ramla linen shirt"
  amount?: number;
  currency?: string;
  percent?: number;
  channel?: 'till' | 'phone'; // phone: sent to the manager's phone instead of approving at the till
  ref?: { type: string; id: Id };
}

// The cashier's till asks for an approval. It goes to the branch manager, or to the owner when it is above the
// manager's limit, and they are told it is waiting. The till then shows ApprovalPinDialog, or waits for the phone.
export const requestTillApproval = (input: TillApprovalInput) =>
  mutate(() => {
    const me = actor();
    const branch = assertBranch(input.branchId, me);
    const { discountLimits, ownerApprovalAbove } = db.settings;
    const aboveManager = (input.kind === 'discount' && (input.percent ?? 0) > discountLimits.manager) || (input.kind !== 'discount' && input.kind !== 'priceOverride' && (input.amount ?? 0) > ownerApprovalAbove);
    const approval: ApprovalRequest = { id: newId(), kind: input.kind, level: aboveManager ? 'owner' : 'manager', status: 'pending', branchId: branch.id, requestedById: me.id, at: nowIso(), amount: input.amount, currency: input.currency ?? branch.currency, percent: input.percent, ref: input.ref, summary: input.summary, channel: input.channel ?? 'till' };
    db.approvals.push(approval);
    const params = { summary: input.summary, user: me.name };
    if (aboveManager) notify('approvalWaiting', params, '/owner/approvals');
    else notifyUsers('approvalWaiting', params, '/manager/approvals', staffWithRole('manager', branch.id).filter((id) => id !== me.id));
    return approval;
  });
