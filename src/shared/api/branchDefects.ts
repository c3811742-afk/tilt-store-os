import { routes } from '@/shared/constants';
import type { BuiltInRole, Defect, DefectFoundAt, DefectLiability, DefectReasonQty, Id, LocationKind, StoredFile, WriteOff } from '@/shared/types';
import { currentTerms, nowIso, stockLevels } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole, staffWithRole } from './branchScope';
import { currentUnitCost, piecesAt, piecesIn, placeIn } from './engine';
import { addBatchDefects, batchForDefect } from './costing';
import { describeVariant, variantLabel } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, notify, respond } from './server';
import { checkStockAlerts } from './stockAlerts';

// Defects and lost stock in a branch, for its manager and storekeeper (a cashier can report a defect from the counter). Reporting a defect takes the pieces out of
// sellable stock (they become "defective"); marking them to return sets them aside for the brand; lost pieces are
// written off once the owner approves. The cost of each piece is kept on the record for the owner's reports, but
// never returned to branch staff.

const assertStaff = (branchId: Id, roles: BuiltInRole[] = ['manager', 'storekeeper']) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !roles.some((role) => hasRole(me, role))) throw new ApiError('notAllowed');
  return me;
};

// The location in the branch with the most available pieces of a variant, when there are at least `qty`.
const fullestPlace = (variantId: Id, branchId: Id, qty: number) => {
  const level = stockLevels(db.movements.filter((movement) => movement.variantId === variantId))
    .filter((current) => current.branchId === branchId && current.status === 'available' && current.qty >= qty)
    .sort((a, b) => b.qty - a.qty)[0];
  return level && { branchId, locationId: level.locationId, status: 'available' as const };
};

// The brand carries the cost when its terms say it replaces defects, the store otherwise.
export const defaultLiability = (variantId: Id): DefectLiability => {
  const brand = db.brands.find((current) => current.id === describeVariant(variantId).brandId);
  return brand && currentTerms(brand).defectPolicy === 'storeAbsorbs' ? 'store' : 'brand';
};

export interface ReportDefectInput {
  branchId: Id;
  variantId: Id;
  qty: number;
  locationKind?: LocationKind; // where the pieces are: shop floor, back room or storage; when not given, where most are
  reasonId?: Id; // the defect type, from the owner's list, when every piece has the same one
  reasons?: DefectReasonQty[]; // or the pieces split by defect type; they add up to qty
  foundAt: DefectFoundAt;
  liability?: DefectLiability; // who carries the cost; the brand's terms decide when not given
  batchId?: Id; // the delivery it came in, for defects found later in storage
  note?: string;
  photos?: StoredFile[];
}

// Records a defect and takes the pieces out of sellable stock, against their batch.
export const reportDefect = (input: ReportDefectInput) =>
  mutate(() => {
    const me = assertStaff(input.branchId, ['manager', 'storekeeper', 'cashier']);
    const branch = findById(db.branches, input.branchId);
    const info = describeVariant(input.variantId);
    const qty = Math.floor(input.qty);
    if (!info.productId || qty < 1) throw new ApiError('notAllowed');
    // One defect per reason; together they cover every piece.
    const reasons = input.reasons?.length ? input.reasons.map((row) => ({ reasonId: row.reasonId, qty: Math.floor(row.qty) })) : [{ reasonId: input.reasonId ?? '', qty }];
    if (reasons.some((row) => !row.reasonId || row.qty < 1)) throw new ApiError('notAllowed');
    if (reasons.reduce((sum, row) => sum + row.qty, 0) !== qty) throw new ApiError('quantityMismatch');
    const from = input.locationKind ? placeIn(branch, input.locationKind) : (fullestPlace(input.variantId, branch.id, qty) ?? placeIn(branch, 'floor'));
    if (piecesAt(db, input.variantId, branch.id, from.locationId) < qty) throw new ApiError('notEnoughStock');
    const batch =
      (input.batchId && db.batches.find((current) => current.id === input.batchId)) ||
      batchForDefect(info.productId, branch.id);
    const at = nowIso();
    const defects = reasons.map((row): Defect => ({
      id: newId(),
      at,
      byId: me.id,
      productId: info.productId,
      variantId: input.variantId,
      batchId: batch?.id,
      branchId: branch.id,
      qty: row.qty,
      reasonId: row.reasonId,
      foundAt: input.foundAt,
      liability: input.liability ?? defaultLiability(input.variantId),
      status: 'open',
      unitCost: currentUnitCost(db, info.productId),
      note: input.note,
      photos: input.photos?.length ? input.photos : undefined,
      locationId: from.locationId,
    }));
    addBatchDefects(batch?.id, qty);
    defects.forEach((defect) => {
      db.defects.push(defect);
      db.movements.push({ id: newId(), at, byId: me.id, variantId: input.variantId, qty: defect.qty, from, to: { ...from, status: 'defective' }, kind: 'statusChange', ref: { type: 'defect', id: defect.id }, reason: defect.reasonId });
    });
    checkStockAlerts(branch.id, [input.variantId]);
    logActivity({ action: 'create', target: { type: 'defect', id: defects[0].id, label: variantLabel(input.variantId) }, branchId: branch.id });
    // Reported at the counter: the branch's managers are told, so they can check the piece.
    if (!hasRole(me, 'manager')) notify('defectiveReturn', { branch: branch.name, product: info.productName }, routes.manager.defects, staffWithRole('manager', branch.id));
    return defects;
  });

export interface BranchDefectRow {
  id: Id;
  at: string;
  byId: Id;
  variantId: Id;
  productName: string;
  size: string;
  color: string;
  sku: string;
  brandId: Id;
  qty: number;
  reasonId: Id;
  foundAt: DefectFoundAt;
  liability: DefectLiability;
  status: Defect['status'];
  toReturn: boolean;
  batchNumber?: string;
  note?: string;
  photos: StoredFile[];
}

// The branch's defects, newest first. No cost.
export const listBranchDefects = (branchId: Id) =>
  respond((): BranchDefectRow[] => {
    assertBranch(branchId);
    return db.defects
      .filter((defect) => defect.branchId === branchId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((defect) => {
        const info = describeVariant(defect.variantId);
        return {
          id: defect.id,
          at: defect.at,
          byId: defect.byId,
          variantId: defect.variantId,
          productName: info.productName,
          size: info.size,
          color: info.color,
          sku: info.sku,
          brandId: info.brandId,
          qty: defect.qty,
          reasonId: defect.reasonId,
          foundAt: defect.foundAt,
          liability: defect.liability,
          status: defect.status,
          toReturn: Boolean(defect.markedToReturnAt),
          batchNumber: db.batches.find((batch) => batch.id === defect.batchId)?.number,
          note: defect.note,
          photos: defect.photos ?? [],
        };
      });
  });

// Sets defective pieces aside to go back to the brand (status "to return to brand").
export const markDefectToReturn = (defectId: Id) =>
  mutate(() => {
    const defect = findById(db.defects, defectId);
    const me = assertStaff(defect.branchId);
    if (defect.status !== 'open' || defect.markedToReturnAt) throw new ApiError('alreadyDecided');
    const branch = findById(db.branches, defect.branchId);
    const locationId = defect.locationId ?? placeIn(branch, branch.kind === 'store' ? 'backRoom' : 'storage').locationId;
    const here = stockLevels(db.movements.filter((movement) => movement.variantId === defect.variantId)).filter(
      (level) => level.branchId === branch.id && level.status === 'defective',
    );
    const at = here.find((level) => level.locationId === locationId) ?? here[0];
    if (!at || at.qty < defect.qty) throw new ApiError('notEnoughStock');
    const from = { branchId: branch.id, locationId: at.locationId, status: 'defective' as const };
    db.movements.push({ id: newId(), at: nowIso(), byId: me.id, variantId: defect.variantId, qty: defect.qty, from, to: { ...from, status: 'toReturn' }, kind: 'statusChange', ref: { type: 'defect', id: defect.id } });
    Object.assign(defect, { markedToReturnById: me.id, markedToReturnAt: nowIso() });
    logActivity({ action: 'update', target: { type: 'defect', id: defect.id, label: defect.id }, branchId: branch.id, changes: [{ field: 'status', from: 'defective', to: 'toReturn' }] });
    return defect;
  });

export interface WriteOffInput {
  branchId: Id;
  variantId: Id;
  qty: number;
  reasonId: Id;
  kind?: WriteOff['kind']; // lost by default
}

// Asks to write off lost (or damaged beyond repair) pieces. The owner approves before the stock goes down.
// How many pieces of an item a branch can still ask to write off: what it has (available for lost pieces, defective
// for defective ones) less what is already waiting for the owner.
const writeOffRoom = (variantId: Id, branchId: Id, kind: WriteOff['kind']) =>
  piecesIn(db, variantId, branchId, kind === 'defective' ? 'defective' : 'available').reduce((sum, level) => sum + level.qty, 0) -
  db.writeOffs.filter((current) => current.variantId === variantId && current.branchId === branchId && current.kind === kind && current.status === 'pending').reduce((sum, current) => sum + current.qty, 0);

export const getWriteOffLimit = (branchId: Id, variantId: Id, kind: WriteOff['kind'] = 'lost') =>
  respond(() => {
    assertBranch(branchId);
    return Math.max(writeOffRoom(variantId, branchId, kind), 0);
  });

export const requestWriteOff = (input: WriteOffInput) =>
  mutate(() => {
    const me = assertStaff(input.branchId);
    const branch = findById(db.branches, input.branchId);
    const info = describeVariant(input.variantId);
    const qty = Math.floor(input.qty);
    if (!info.productId || qty < 1 || !input.reasonId) throw new ApiError('notAllowed');
    if (qty > writeOffRoom(input.variantId, branch.id, input.kind ?? 'lost')) throw new ApiError('notEnoughStock');
    const writeOff: WriteOff = { id: newId(), at: nowIso(), byId: me.id, variantId: input.variantId, branchId: branch.id, qty, kind: input.kind ?? 'lost', reasonId: input.reasonId, unitCost: currentUnitCost(db, info.productId), status: 'pending' };
    db.writeOffs.push(writeOff);
    const label = `${info.productName} · ${info.size} · ${info.color} × ${qty}`;
    db.approvals.push({ id: newId(), kind: 'writeOff', level: 'owner', status: 'pending', branchId: branch.id, requestedById: me.id, at: writeOff.at, ref: { type: 'writeOff', id: writeOff.id }, summary: label });
    notify('approvalWaiting', { summary: label, user: me.name }, '/owner/defects?tab=writeOffs');
    logActivity({ action: 'create', target: { type: 'writeOff', id: writeOff.id, label }, branchId: branch.id });
    return writeOff;
  });

// The branch's write-offs and their approval, newest first. No cost.
export const listBranchWriteOffs = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.writeOffs
      .filter((writeOff) => writeOff.branchId === branchId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(({ unitCost: _unitCost, ...writeOff }) => ({ writeOff, ...describeVariant(writeOff.variantId) }));
  });

// ---- Customer returns waiting for inspection -----------------------------------------------------------------

export interface InspectionRow {
  variantId: Id;
  locationId: Id;
  qty: number;
  productName: string;
  size: string;
  color: string;
  sku: string;
  brandId: Id;
  since?: string; // when the last returned piece came in
}

// Pieces customers returned that are waiting for the storekeeper to check their condition.
export const listAwaitingInspection = (branchId: Id) =>
  respond((): InspectionRow[] => {
    assertBranch(branchId);
    return stockLevels(db.movements)
      .filter((level) => level.branchId === branchId && level.status === 'pendingInspection' && level.qty > 0)
      .map((level) => {
        const last = db.movements.filter((movement) => movement.variantId === level.variantId && movement.to?.branchId === branchId && movement.to.status === 'pendingInspection').sort((a, b) => b.at.localeCompare(a.at))[0];
        return { variantId: level.variantId, locationId: level.locationId, qty: level.qty, ...describeVariant(level.variantId), since: last?.at };
      })
      .sort((a, b) => (b.since ?? '').localeCompare(a.since ?? ''));
  });

export type InspectionOutcome = 'available' | 'defective' | 'toReturn';

export interface InspectInput {
  branchId: Id;
  variantId: Id;
  locationId: Id;
  qty: number;
  outcome: InspectionOutcome; // back on sale, defective, or set aside for the brand
  reasonId?: Id; // the defect type, for defective pieces
  liability?: DefectLiability;
  note?: string;
}

// Confirms the condition of returned pieces: they go back on sale, or are recorded as defective (against their
// batch), or are set aside to return to the brand.
export const inspectReturnedItem = (input: InspectInput) =>
  mutate(() => {
    const me = assertStaff(input.branchId);
    const qty = Math.floor(input.qty);
    if (qty < 1) throw new ApiError('notAllowed');
    if (input.outcome === 'defective' && !input.reasonId) throw new ApiError('missingReason');
    const waiting = stockLevels(db.movements.filter((movement) => movement.variantId === input.variantId)).find(
      (level) => level.branchId === input.branchId && level.locationId === input.locationId && level.status === 'pendingInspection',
    );
    if (!waiting || waiting.qty < qty) throw new ApiError('notEnoughStock');
    const at = nowIso();
    const from = { branchId: input.branchId, locationId: input.locationId, status: 'pendingInspection' as const };
    const info = describeVariant(input.variantId);
    let ref: { type: 'defect'; id: Id } | undefined;
    if (input.outcome === 'defective') {
      const batch = batchForDefect(info.productId, input.branchId);
      const defect: Defect = { id: newId(), at, byId: me.id, productId: info.productId, variantId: input.variantId, batchId: batch?.id, branchId: input.branchId, qty, reasonId: input.reasonId ?? '', foundAt: 'customerReturn', liability: input.liability ?? defaultLiability(input.variantId), status: 'open', unitCost: currentUnitCost(db, info.productId), note: input.note, locationId: input.locationId };
      db.defects.push(defect);
      addBatchDefects(defect.batchId, qty);
      ref = { type: 'defect', id: defect.id };
    }
    db.movements.push({ id: newId(), at, byId: me.id, variantId: input.variantId, qty, from, to: { ...from, status: input.outcome }, kind: 'statusChange', ref, reason: input.note });
    logActivity({ action: 'update', target: { type: 'stock', id: input.variantId, label: variantLabel(input.variantId) }, branchId: input.branchId, changes: [{ field: 'status', from: 'pendingInspection', to: input.outcome }] });
    return { outcome: input.outcome, qty };
  });
