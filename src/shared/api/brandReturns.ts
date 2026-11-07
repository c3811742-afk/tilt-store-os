import type { BrandReturn, Id, StockStatus } from '@/shared/types';
import { convert, nowIso, stockLevels } from '@/shared/utils';
import { ApiError } from './errors';
import { assertBranch, hasRole } from './branchScope';
import { placeIn } from './engine';
import { describeVariant } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, respond } from './server';

// Returns to brands: unsold stock, or defective pieces, sent back with a return note. Stock goes down as they
// leave (the pieces move to "returned"). The brand then replaces them or gives a credit, which is recorded on the
// return, on the defects and, for a credit, on the batch so its cost comes down.

const assertStorekeeper = (branchId: Id) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !hasRole(me, 'storekeeper') && !hasRole(me, 'manager')) throw new ApiError('notAllowed');
  return me;
};

export interface ReturnCandidate {
  variantId: Id;
  locationId: Id;
  status: StockStatus; // toReturn, defective or available
  qty: number;
  defectId?: Id; // the defect it belongs to, for defective pieces
  foundAt?: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  brandId: Id;
}

// What a branch could send back to a brand: pieces set aside to return, defective pieces (with their defect) and,
// for unsold stock, available pieces.
export const listReturnCandidates = (branchId: Id, brandId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const brandOf = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, product.brandId] as const)));
    const openDefects = db.defects.filter((defect) => defect.branchId === branchId && defect.status === 'open');
    return stockLevels(db.movements)
      .filter((level) => level.branchId === branchId && brandOf.get(level.variantId) === brandId && (level.status === 'toReturn' || level.status === 'defective' || level.status === 'available') && level.qty > 0)
      .map((level): ReturnCandidate => {
        const defect = level.status === 'available' ? undefined : openDefects.find((current) => current.variantId === level.variantId);
        return { variantId: level.variantId, locationId: level.locationId, status: level.status, qty: level.qty, defectId: defect?.id, foundAt: defect?.foundAt, ...describeVariant(level.variantId) };
      })
      .sort((a, b) => Number(a.status === 'available') - Number(b.status === 'available') || a.productName.localeCompare(b.productName));
  });

// Defective pieces damaged in the store (not the brand's fault), which go to the warehouse instead of the brand.
export const listStoreDamaged = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    // Only while defective pieces are still here (a transfer to the warehouse takes them away).
    const defectiveHere = new Map<Id, number>();
    stockLevels(db.movements).forEach((level) => {
      if (level.branchId === branchId && level.status === 'defective') defectiveHere.set(level.variantId, (defectiveHere.get(level.variantId) ?? 0) + level.qty);
    });
    return db.defects
      .filter((defect) => defect.branchId === branchId && defect.status === 'open' && defect.foundAt === 'store' && !defect.markedToReturnAt)
      .map((defect) => ({ defectId: defect.id, variantId: defect.variantId, qty: Math.min(defect.qty, defectiveHere.get(defect.variantId) ?? 0), at: defect.at, ...describeVariant(defect.variantId) }))
      .filter((row) => row.qty > 0);
  });

export interface BrandReturnInput {
  branchId: Id;
  brandId: Id;
  lines: { variantId: Id; locationId: Id; status: StockStatus; qty: number; defectId?: Id }[];
  note?: string;
}

export const createBrandReturn = (input: BrandReturnInput) =>
  mutate(() => {
    const me = assertStorekeeper(input.branchId);
    findById(db.brands, input.brandId);
    const lines = input.lines.filter((line) => line.qty > 0 && ['toReturn', 'defective', 'available'].includes(line.status));
    if (!lines.length) throw new ApiError('notAllowed');
    const levels = stockLevels(db.movements);
    lines.forEach((line) => {
      const here = levels.find((level) => level.variantId === line.variantId && level.branchId === input.branchId && level.locationId === line.locationId && level.status === line.status);
      if (!here || here.qty < line.qty) throw new ApiError('notEnoughStock');
    });
    const at = nowIso();
    const record: BrandReturn = {
      id: newId(),
      number: nextNumber('RB', 4),
      brandId: input.brandId,
      branchId: input.branchId,
      at,
      byId: me.id,
      lines: lines.map((line) => ({ variantId: line.variantId, qty: Math.floor(line.qty), condition: line.status === 'available' ? 'unsold' : 'defective', defectId: line.defectId })),
      note: input.note?.trim() || undefined,
      status: 'sent',
    };
    lines.forEach((line) => {
      const from = { branchId: input.branchId, locationId: line.locationId, status: line.status };
      db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty: Math.floor(line.qty), from, to: { ...from, status: 'returned' }, kind: 'returnToBrand', ref: { type: 'brandReturn', id: record.id } });
      const defect = line.defectId ? db.defects.find((current) => current.id === line.defectId) : undefined;
      if (defect && defect.status === 'open') defect.status = 'returnedToBrand';
    });
    db.brandReturns.push(record);
    logActivity({ action: 'send', target: { type: 'stock', id: record.id, label: record.number }, branchId: input.branchId, changes: [{ field: 'returned', from: null, to: lines.reduce((sum, line) => sum + line.qty, 0) }] });
    return record;
  });

export const listBrandReturns = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.brandReturns.filter((record) => record.branchId === branchId).sort((a, b) => b.at.localeCompare(a.at));
  });

export const getBrandReturn = (returnId: Id, branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const record = findById(db.brandReturns, returnId);
    if (record.branchId !== branchId) throw new ApiError('notFound');
    return { record, lines: record.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })) };
  });

export interface SettlementInput {
  kind: 'replacement' | 'credit';
  amount?: number; // a credit, in the branch's currency
  qty?: number; // replacement pieces received
  note?: string;
}

// The brand replaced the pieces (they come back into stock as available) or gave a credit (recorded against the
// batches of the defective pieces, which lowers their cost).
export const settleBrandReturn = (returnId: Id, input: SettlementInput) =>
  mutate(() => {
    const record = findById(db.brandReturns, returnId);
    const me = assertStorekeeper(record.branchId);
    if (record.status === 'settled') throw new ApiError('alreadyDecided');
    const branch = findById(db.branches, record.branchId);
    const at = nowIso();
    if (input.kind === 'credit' && !((input.amount ?? 0) > 0)) throw new ApiError('notAllowed');
    if (input.kind === 'replacement') {
      const total = record.lines.reduce((sum, line) => sum + line.qty, 0);
      let left = Math.min(Math.max(Math.floor(input.qty ?? total), 0), total);
      record.lines.forEach((line) => {
        const qty = Math.min(line.qty, left);
        left -= qty;
        if (qty > 0) db.movements.push({ id: newId(), at, byId: me.id, variantId: line.variantId, qty, to: placeIn(branch, branch.kind === 'store' ? 'backRoom' : 'storage'), kind: 'receive', ref: { type: 'brandReturn', id: record.id }, reason: 'replacement' });
      });
    }
    const defectIds = record.lines.map((line) => line.defectId).filter((id): id is Id => Boolean(id));
    db.defects.filter((defect) => defectIds.includes(defect.id)).forEach((defect) => (defect.status = 'credited'));
    if (input.kind === 'credit' && defectIds.length) {
      const batches = [...new Set(db.defects.filter((defect) => defectIds.includes(defect.id) && defect.batchId).map((defect) => defect.batchId as Id))];
      batches.forEach((batchId) => {
        const batch = db.batches.find((current) => current.id === batchId);
        // Batches are kept in the base currency; the credit is in the branch's.
        if (batch) batch.brandCredit += convert((input.amount ?? 0) / batches.length, branch.currency, db.settings.baseCurrency, at, db.rates, db.settings.baseCurrency);
      });
    }
    record.status = 'settled';
    record.settlement = { kind: input.kind, amount: input.amount, currency: branch.currency, qty: input.qty, at, byId: me.id, note: input.note?.trim() || undefined };
    logActivity({ action: 'update', target: { type: 'stock', id: record.id, label: record.number }, branchId: branch.id, amount: input.amount, currency: branch.currency, changes: [{ field: 'settlement', from: null, to: input.kind }] });
    return record;
  });
