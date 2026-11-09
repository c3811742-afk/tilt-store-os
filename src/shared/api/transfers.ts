import type { Branch, Id, LocationKind, Signature, SignedLine, Transfer, TransferLine, User } from '@/shared/types';
import { currentTerms, nowIso, stockLevels } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole, notifyUsers, staffWithRole } from './branchScope';
import { currentUnitCost, placeIn } from './engine';
import { addBatchDefects } from './costing';
import { describeVariant, toTransferView } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';
import { checkStockAlerts } from './stockAlerts';

// Transfers between branches and the warehouse, from request to receipt. Every step is a recorded change:
// stock only moves through movements (out of the sending branch into "in transit", then into the receiving
// branch), every signature is kept, and nothing is edited once it is done.
//
// requested -> approved (by the sending branch's manager; a branch without a manager, like the warehouse,
// approves its own) -> picked up (the driver signs; the stock is "in transit") -> delivered (the driver signs at
// the store) -> received (the storekeeper or manager countersigns what arrived). Rejected and cancelled end it.

export type TransferStage = 'requested' | 'approved' | 'pickedUp' | 'delivered' | 'received' | 'rejected' | 'cancelled';

export const transferStages: readonly TransferStage[] = ['requested', 'approved', 'pickedUp', 'delivered', 'received'];

export const stageOf = (transfer: Transfer): TransferStage => {
  if (transfer.status === 'sent') return transfer.delivery ? 'delivered' : 'pickedUp';
  return transfer.status;
};

export type StaffTransferView = ReturnType<typeof toTransferView> & {
  stage: TransferStage;
  direction: 'in' | 'out'; // seen from the branch asking
  extra: number;
  differenceOpen: boolean; // a driver difference or missing pieces nobody has closed yet
};

const toStaffView = (transfer: Transfer, branchId: Id): StaffTransferView => {
  const view = toTransferView(transfer);
  const extra = transfer.lines.reduce((sum, line) => sum + (line.extra ?? 0), 0);
  return {
    ...view,
    stage: stageOf(transfer),
    direction: transfer.toBranchId === branchId ? 'in' : 'out',
    extra,
    differenceOpen: (view.driverMismatch || view.missing > 0 || extra > 0) && !transfer.differenceClosedAt,
  };
};

const managersOf = (branchId: Id) => staffWithRole('manager', branchId);
const storekeepersOf = (branchId: Id) => staffWithRole('storekeeper', branchId);
const describe = (transfer: Transfer) => `${transfer.number} · ${findById(db.branches, transfer.fromBranchId).name} → ${findById(db.branches, transfer.toBranchId).name}`;
const log = (transfer: Transfer, action: Parameters<typeof logActivity>[0]['action'], branchId: Id = transfer.fromBranchId) =>
  logActivity({ action, target: { type: 'transfer', id: transfer.id, label: transfer.number }, branchId });

// The person may act for this branch: they work there (or are an owner) and have the role.
const assertRoleIn = (branchId: Id, roles: readonly Parameters<typeof hasRole>[1][]) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !roles.some((role) => hasRole(me, role))) throw new ApiError('notAllowed');
  return me;
};

const needsManager = (branchId: Id) => managersOf(branchId).length > 0;

const cleanLines = (lines: readonly { variantId: Id; qty: number }[]): TransferLine[] => {
  const merged = new Map<Id, number>();
  lines.forEach((line) => {
    if (line.qty > 0) merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + Math.floor(line.qty));
  });
  if (!merged.size) throw new ApiError('notAllowed');
  return [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty }));
};

// ---- Reading ------------------------------------------------------------------------------------------------

// Every transfer into or out of a branch, newest first.
export const listBranchTransfers = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.transfers
      .filter((transfer) => transfer.fromBranchId === branchId || transfer.toBranchId === branchId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((transfer) => toStaffView(transfer, branchId));
  });

export const getTransfer = (transferId: Id, branchId: Id) =>
  respond(() => {
    const transfer = findById(db.transfers, transferId);
    if (transfer.fromBranchId !== branchId && transfer.toBranchId !== branchId) throw new ApiError('notFound');
    assertBranch(branchId);
    return toStaffView(transfer, branchId);
  });

// The transfers a driver is assigned to, newest first. A driver sees nothing else.
export const listDriverJobs = () =>
  respond(() => {
    const me = actor();
    return db.transfers
      .filter((transfer) => transfer.driverId === me.id && transfer.status !== 'cancelled' && transfer.status !== 'rejected')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((transfer) => toStaffView(transfer, transfer.toBranchId));
  });

export const getDriverJob = (transferId: Id) =>
  respond(() => {
    const transfer = findById(db.transfers, transferId);
    if (transfer.driverId !== actor().id) throw new ApiError('notFound');
    return {
      ...toStaffView(transfer, transfer.toBranchId),
      // Who may hand the stock over and take it at the store, for the signature forms.
      fromStorekeepers: storekeepersOf(transfer.fromBranchId).concat(managersOf(transfer.fromBranchId)),
      toStorekeepers: storekeepersOf(transfer.toBranchId).concat(managersOf(transfer.toBranchId)),
    };
  });

// Active drivers who can be given a transfer from this branch.
export const listDrivers = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return staffWithRole('driver').map((id) => ({ id, name: findById(db.users, id).name, local: findById(db.users, id).branchIds.includes(branchId) }));
  });

// ---- Asking for stock -----------------------------------------------------------------------------------------

export interface TransferInput {
  fromBranchId: Id;
  toBranchId: Id;
  lines: { variantId: Id; qty: number }[];
  note?: string;
  stockStatus?: 'defective'; // damaged pieces going to the warehouse
}

// Creates a transfer. Asked for by the receiving branch, or prepared by the sending one (a dispatch).
// It waits for the sending branch's manager unless that branch has none (the warehouse) or the manager made it.
export const createTransfer = (input: TransferInput) =>
  mutate(() => {
    if (input.fromBranchId === input.toBranchId) throw new ApiError('notAllowed');
    const me = actor();
    const ownSide = me.branchIds.includes(input.toBranchId) || isOwner(me) ? input.toBranchId : input.fromBranchId;
    assertRoleIn(ownSide, ['manager', 'storekeeper']);
    const from = findById(db.branches, input.fromBranchId);
    const to = findById(db.branches, input.toBranchId);
    const autoApproved = !needsManager(from.id) || (hasRole(me, 'manager') && me.branchIds.includes(from.id));
    const transfer: Transfer = {
      id: newId(),
      number: nextNumber('TR', 4),
      fromBranchId: from.id,
      toBranchId: to.id,
      lines: cleanLines(input.lines),
      status: autoApproved ? 'approved' : 'requested',
      requestedById: me.id,
      createdAt: nowIso(),
      note: input.note,
      stockStatus: input.stockStatus,
      ...(autoApproved ? { decidedById: me.id, decidedAt: nowIso() } : {}),
    };
    db.transfers.push(transfer);
    if (autoApproved) notifyUsers('transferReady', { number: transfer.number, to: to.name }, '/storekeeper/transfers?tab=prepare', storekeepersOf(from.id));
    else {
      db.approvals.push({ id: newId(), kind: 'transfer', level: 'manager', status: 'pending', branchId: from.id, requestedById: me.id, at: transfer.createdAt, ref: { type: 'transfer', id: transfer.id }, summary: describe(transfer) });
      notifyUsers('approvalWaiting', { summary: describe(transfer), user: me.name }, '/manager/approvals', managersOf(from.id));
    }
    log(transfer, 'create', ownSide);
    return transfer;
  });

// The sending branch's manager approves (the storekeepers are told to prepare it) or rejects it with a reason.
export const decideTransfer = (transferId: Id, approve: boolean, reason?: string, note?: string) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    const me = assertRoleIn(transfer.fromBranchId, ['manager']);
    if (transfer.status !== 'requested') throw new ApiError('alreadyDecided');
    Object.assign(transfer, { status: approve ? 'approved' : 'rejected', decidedById: me.id, decidedAt: nowIso(), decisionReason: reason, decisionNote: note });
    db.approvals
      .filter((approval) => approval.ref?.type === 'transfer' && approval.ref.id === transfer.id && approval.status === 'pending')
      .forEach((approval) => Object.assign(approval, { status: approve ? 'approved' : 'rejected', decidedById: me.id, decidedAt: transfer.decidedAt, reason, channel: 'app' }));
    const to = findById(db.branches, transfer.toBranchId);
    const decided = { number: transfer.number, decision: approve ? 'approved' : 'rejected', note: note ?? '' };
    if (approve) {
      notifyUsers('transferReady', { number: transfer.number, to: to.name }, '/storekeeper/transfers?tab=prepare', storekeepersOf(transfer.fromBranchId));
      // The receiving branch's storekeepers know it is coming.
      notifyUsers('transferDecided', decided, `/storekeeper/transfers/${transfer.id}`, storekeepersOf(transfer.toBranchId).filter((id) => id !== transfer.requestedById));
    }
    // Whoever asked is told, with a link to their own screen.
    const requester = db.users.find((user) => user.id === transfer.requestedById);
    const requesterLink = requester && hasRole(requester, 'manager') ? `/manager/transfers/${transfer.id}` : `/storekeeper/transfers/${transfer.id}`;
    notifyUsers('transferDecided', decided, requesterLink, [transfer.requestedById]);
    log(transfer, approve ? 'approve' : 'reject');
    return transfer;
  });

// Cancelled before it leaves: by whoever asked for it, or a manager of either branch.
export const cancelTransfer = (transferId: Id) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    const me = actor();
    const allowed = transfer.requestedById === me.id || isOwner(me) || [transfer.fromBranchId, transfer.toBranchId].some((id) => hasRole(me, 'manager') && me.branchIds.includes(id));
    if (!allowed) throw new ApiError('notAllowed');
    if (transfer.status !== 'requested' && transfer.status !== 'approved') throw new ApiError('alreadyDecided');
    Object.assign(transfer, { status: 'cancelled', cancelledById: me.id, cancelledAt: nowIso() });
    db.approvals
      .filter((approval) => approval.ref?.type === 'transfer' && approval.ref.id === transfer.id && approval.status === 'pending')
      .forEach((approval) => Object.assign(approval, { status: 'rejected', decidedById: me.id, decidedAt: transfer.cancelledAt, channel: 'app' }));
    log(transfer, 'update');
    return transfer;
  });

// ---- Preparing and handing over -------------------------------------------------------------------------------

export const assignDriver = (transferId: Id, driverId: Id) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    assertRoleIn(transfer.fromBranchId, ['storekeeper', 'manager']);
    if (transfer.status !== 'approved') throw new ApiError('alreadyDecided');
    const driver = findById(db.users, driverId);
    if (!hasRole(driver, 'driver')) throw new ApiError('notAllowed');
    transfer.driverId = driver.id;
    notifyUsers('transferAssigned', { number: transfer.number, from: findById(db.branches, transfer.fromBranchId).name, to: findById(db.branches, transfer.toBranchId).name }, `/driver/jobs/${transfer.id}`, [driver.id]);
    logActivity({ action: 'update', target: { type: 'transfer', id: transfer.id, label: transfer.number }, branchId: transfer.fromBranchId, changes: [{ field: 'driver', from: null, to: driver.name }] });
    return transfer;
  });

const pickOrder = (branch: Branch): LocationKind[] => (branch.kind === 'store' ? ['backRoom', 'floor'] : ['storage']);

const signature = (name: string, user: User | undefined, lines: SignedLine[]): Signature => {
  if (!name.trim()) throw new ApiError('notAllowed');
  return { name: name.trim(), userId: user?.id, signedAt: nowIso(), lines };
};

export interface PickupInput {
  signedName: string; // the driver's full name, typed as their signature
  lines: { variantId: Id; qty: number }[]; // what the driver confirms receiving, per product
  handedOverById?: Id; // the storekeeper who gave the stock (the person signed in, when signed on their screen)
}

// The driver signs for what they take; only then does the stock leave. The pieces move from the sending branch
// into "in transit" at the receiving branch, and the transfer is on its way.
export const pickUpTransfer = (transferId: Id, input: PickupInput) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    const me = actor();
    const isDriver = transfer.driverId === me.id;
    if (!isDriver) assertRoleIn(transfer.fromBranchId, ['storekeeper', 'manager']);
    if (transfer.status !== 'approved') throw new ApiError('alreadyDecided');
    if (!transfer.driverId) throw new ApiError('notAllowed');
    const driver = findById(db.users, transfer.driverId);
    const handedOverById = isDriver ? input.handedOverById : me.id;
    if (!handedOverById) throw new ApiError('notAllowed');

    const from = findById(db.branches, transfer.fromBranchId);
    const to = findById(db.branches, transfer.toBranchId);
    const lines = transfer.lines.map((line) => ({ variantId: line.variantId, qty: Math.max(0, Math.floor(input.lines.find((current) => current.variantId === line.variantId)?.qty ?? 0)), requested: line.qty }));
    if (!lines.some((line) => line.qty > 0)) throw new ApiError('notAllowed');
    if (lines.some((line) => line.qty > line.requested)) throw new ApiError('quantityMismatch');

    // Defective pieces sent to the warehouse travel as defective; everything else moves from available stock.
    const moving = transfer.stockStatus ?? 'available';
    // Check every line first, so nothing moves unless all of it can.
    const levels = stockLevels(db.movements.filter((movement) => lines.some((line) => line.variantId === movement.variantId)));
    const plan = lines.flatMap((line) => {
      let remaining = line.qty;
      const takes = pickOrder(from).flatMap((kind) => {
        const place = placeIn(from, kind, moving);
        const here = levels.filter((level) => level.variantId === line.variantId && level.branchId === from.id && level.locationId === place.locationId && level.status === moving).reduce((sum, level) => sum + level.qty, 0);
        const take = Math.min(here, remaining);
        remaining -= take;
        return take > 0 ? [{ variantId: line.variantId, qty: take, from: place }] : [];
      });
      if (remaining > 0) throw new ApiError('notEnoughStock');
      return takes;
    });

    const at = nowIso();
    plan.forEach((take) =>
      db.movements.push({ id: newId(), at, byId: me.id, variantId: take.variantId, qty: take.qty, from: take.from, to: placeIn(to, to.kind === 'store' ? 'backRoom' : 'storage', 'inTransit'), kind: 'transferOut', ref: { type: 'transfer', id: transfer.id } }),
    );
    Object.assign(transfer, { status: 'sent', sentAt: at, handedOverById, pickup: signature(input.signedName, driver, lines.map(({ variantId, qty }) => ({ variantId, qty }))) });
    checkStockAlerts(from.id, lines.map((line) => line.variantId));
    log(transfer, 'send');
    return transfer;
  });

export interface DeliveryInput {
  signedName: string; // the driver's full name
  lines: { variantId: Id; qty: number }[]; // what the driver hands over, per product
  deliveredToId: Id; // the storekeeper (or manager) who took it
}

// The driver signs at the store for what they hand over. A different quantity from the pickup is flagged to the
// receiving branch's manager and the owners; the branch is told the stock is there to check.
export const deliverTransfer = (transferId: Id, input: DeliveryInput) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    if (transfer.driverId !== actor().id) throw new ApiError('notAllowed');
    if (transfer.status !== 'sent' || transfer.delivery) throw new ApiError('alreadyDecided');
    const driver = findById(db.users, transfer.driverId);
    const lines = transfer.lines.map((line) => ({ variantId: line.variantId, qty: Math.max(0, Math.floor(input.lines.find((current) => current.variantId === line.variantId)?.qty ?? 0)) }));
    const pickedUp = (variantId: Id) => transfer.pickup?.lines.find((current) => current.variantId === variantId)?.qty ?? 0;
    if (lines.some((line) => line.qty > pickedUp(line.variantId))) throw new ApiError('quantityMismatch');
    Object.assign(transfer, { delivery: signature(input.signedName, driver, lines), deliveredAt: nowIso(), deliveredToId: input.deliveredToId });
    const to = findById(db.branches, transfer.toBranchId);
    if (toTransferView(transfer).driverMismatch) {
      notify('pickupMismatch', { number: transfer.number }, '/owner/transfers?tab=differences');
      notifyUsers('pickupMismatch', { number: transfer.number }, `/manager/transfers/${transfer.id}`, managersOf(to.id));
    }
    notifyUsers('transferArrived', { number: transfer.number, branch: to.name }, `/manager/transfers/${transfer.id}`, managersOf(to.id));
    notifyUsers('transferArrived', { number: transfer.number, branch: to.name }, `/storekeeper/transfers/${transfer.id}`, storekeepersOf(to.id));
    log(transfer, 'update', to.id);
    return transfer;
  });

export interface ReceiveInput {
  signedName: string; // the storekeeper's (or manager's) full name
  lines: { variantId: Id; received: number; defects: number; extra?: number }[];
  defectReasonId?: Id; // why the defective pieces are defective
  note?: string;
}

// The receiving branch countersigns: for each product, how many arrived, how many are defective and how many are
// missing. Good pieces become available, defective ones are set aside and recorded against their batch, missing
// ones are written off with the transfer as the reason, and extra pieces are taken in from the sending branch.
export const receiveTransfer = (transferId: Id, input: ReceiveInput) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    const me = assertRoleIn(transfer.toBranchId, ['storekeeper', 'manager']);
    if (transfer.status !== 'sent') throw new ApiError('alreadyDecided');
    const from = findById(db.branches, transfer.fromBranchId);
    const to = findById(db.branches, transfer.toBranchId);
    const at = nowIso();
    const kind: LocationKind = to.kind === 'store' ? 'backRoom' : 'storage';
    const transit = placeIn(to, kind, 'inTransit');
    const ref = { type: 'transfer' as const, id: transfer.id };
    const reasonId = input.defectReasonId ?? db.settings.lists.defectReasons[0]?.id ?? '';

    const signed: SignedLine[] = transfer.lines.map((line) => {
      const pickedUp = transfer.pickup?.lines.find((current) => current.variantId === line.variantId)?.qty ?? line.qty;
      const answer = input.lines.find((current) => current.variantId === line.variantId);
      const delivered = transfer.delivery?.lines.find((current) => current.variantId === line.variantId)?.qty ?? pickedUp;
      const received = Math.max(0, Math.floor(answer?.received ?? 0));
      const defects = Math.max(0, Math.floor(answer?.defects ?? 0));
      if (received > delivered || defects > received) throw new ApiError('quantityMismatch');
      const extra = Math.max(0, Math.floor(answer?.extra ?? 0));
      const missing = pickedUp - received;
      const good = received - defects;
      const move = (qty: number, status: 'available' | 'defective' | 'writtenOff', movementKind: 'transferIn' | 'writeOff', reason?: string) => {
        if (qty > 0) db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty, from: transit, to: placeIn(to, kind, status), kind: movementKind, ref, reason });
      };
      move(good, transfer.stockStatus ?? 'available', 'transferIn');
      move(defects, 'defective', 'transferIn');
      move(missing, 'writtenOff', 'writeOff', transfer.number);
      if (extra > 0) {
        db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty: extra, from: placeIn(from, pickOrder(from)[0]), to: placeIn(to, kind), kind: 'transferIn', ref, reason: 'extra' });
      }
      if (defects > 0) {
        const info = describeVariant(line.variantId);
        const batch = db.batches.filter((current) => current.productId === info.productId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
        const brand = db.brands.find((current) => current.id === info.brandId);
        const liability = brand && currentTerms(brand).defectPolicy === 'storeAbsorbs' ? 'store' : 'brand';
        db.defects.push({ id: newId(), at, byId: me.id, productId: info.productId, variantId: line.variantId, batchId: batch?.id, branchId: to.id, qty: defects, reasonId, foundAt: 'receiving', liability, status: 'open', unitCost: currentUnitCost(db, info.productId), note: transfer.number });
        addBatchDefects(batch?.id, defects);
      }
      Object.assign(line, { received, defects, extra });
      return { variantId: line.variantId, qty: received, defects, missing };
    });

    Object.assign(transfer, { status: 'received', receivedAt: at, receivedById: me.id, receipt: signature(input.signedName, me, signed), differenceNote: input.note || transfer.differenceNote });
    const missing = signed.reduce((sum, line) => sum + (line.missing ?? 0), 0);
    if (missing > 0) {
      const params = { number: transfer.number, qty: String(missing), branch: to.name };
      notify('transferMissing', params, '/owner/transfers?tab=differences');
      notifyUsers('transferMissing', params, `/manager/transfers/${transfer.id}`, managersOf(to.id));
    }
    log(transfer, 'update', to.id);
    return transfer;
  });

// A manager reviews a difference (driver pickup vs delivery, missing or extra pieces) and closes it with a note.
export const closeTransferDifference = (transferId: Id, note: string) =>
  mutate(() => {
    const transfer = findById(db.transfers, transferId);
    const me = actor();
    const branchId = [transfer.toBranchId, transfer.fromBranchId].find((id) => me.branchIds.includes(id)) ?? transfer.toBranchId;
    assertRoleIn(branchId, ['manager']);
    if (!note.trim()) throw new ApiError('notAllowed');
    if (transfer.differenceClosedAt) throw new ApiError('alreadyDecided');
    Object.assign(transfer, { differenceNote: note.trim(), differenceClosedById: me.id, differenceClosedAt: nowIso() });
    logActivity({ action: 'update', target: { type: 'transfer', id: transfer.id, label: transfer.number }, branchId, changes: [{ field: 'difference', from: null, to: note.trim() }] });
    return transfer;
  });
