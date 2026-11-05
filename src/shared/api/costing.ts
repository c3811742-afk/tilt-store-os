import type { Batch, DefectHandling, Id } from '@/shared/types';
import { batchUnitCosts, convert, currentTerms, inRange, nowIso, shopPrice, type DateRange } from '@/shared/utils';
import { ApiError } from './errors';
import { placeIn } from './engine';
import { actor, db, findById, logActivity, mutate, newId, notify, respond } from './server';

// Marks the approval requests about a record as decided (they are kept in the approvals log).
export const resolveApprovals = (refType: string, refId: Id, approve: boolean, reason?: string) => {
  const me = actor().id;
  db.approvals
    .filter((approval) => approval.ref?.type === refType && approval.ref.id === refId && approval.status === 'pending')
    .forEach((approval) => Object.assign(approval, { status: approve ? 'approved' : 'rejected', decidedById: me, decidedAt: nowIso(), reason }));
};

// ---- Batches ----------------------------------------------------------------------------------------------------

export interface BatchRow {
  batch: Batch;
  productName: string;
  costs: ReturnType<typeof batchUnitCosts>;
  model: string;
  suggestedPrice: number | null; // own brands: a new price that keeps the margin after defects
  currentPrice: number | null;
}

const toRow = (batch: Batch): BatchRow => {
  const product = db.products.find((current) => current.id === batch.productId);
  const brand = db.brands.find((current) => current.id === batch.brandId);
  const costs = batchUnitCosts(batch);
  const model = brand ? currentTerms(brand).model : 'own';
  const currentPrice = product?.prices[batch.currency] ?? null;
  // The price rises by the same share as the cost, so the margin stays where it was.
  const suggestedPrice = model === 'own' && currentPrice !== null && costs.original > 0 && costs.adjusted > costs.original ? shopPrice((currentPrice * costs.adjusted) / costs.original) : null;
  return { batch, productName: product?.name ?? '', costs, model, suggestedPrice, currentPrice };
};

export const listBatches = (filter: { brandId?: Id; branchId?: Id; withDefects?: boolean; pending?: boolean }) =>
  respond(() =>
    db.batches
      .filter(
        (batch) =>
          (!filter.brandId || batch.brandId === filter.brandId) &&
          (!filter.branchId || batch.branchId === filter.branchId) &&
          (!filter.withDefects || batch.defects > 0) &&
          (!filter.pending || batch.redistribution === 'pending'),
      )
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .map(toRow),
  );

export const getBatch = (batchId: Id) =>
  respond(() => ({
    ...toRow(findById(db.batches, batchId)),
    defects: db.defects.filter((defect) => defect.batchId === batchId),
  }));

// The batch's total cost, its defects, and how they are handled. A change that moves the cost per piece
// waits for an owner's approval before sales use it.
export const updateBatch = (batchId: Id, input: { totalCost: number; defects: number; defectHandling: DefectHandling }) =>
  mutate(() => {
    const batch = findById(db.batches, batchId);
    const before = batchUnitCosts(batch);
    const from = { totalCost: batch.totalCost, defects: batch.defects, defectHandling: batch.defectHandling };
    Object.assign(batch, input);
    const after = batchUnitCosts({ ...batch, redistribution: 'approved' });
    const moves = input.defectHandling === 'redistribute' && Math.abs(after.adjusted - before.effective) > 0.005;
    if (moves) {
      batch.redistribution = 'pending';
      if (!db.approvals.some((approval) => approval.ref?.id === batchId && approval.status === 'pending')) {
        db.approvals.push({ id: newId(), kind: 'costRedistribution', level: 'owner', branchId: batch.branchId, requestedById: actor().id, at: nowIso(), ref: { type: 'batch', id: batchId }, summary: batch.number, status: 'pending' });
      }
      notify('batchCostChanged', { batch: batch.number, from: before.effective.toFixed(2), to: after.adjusted.toFixed(2) }, `/owner/costing/${batch.id}`);
    } else if (input.defectHandling === 'writeOff') {
      batch.redistribution = 'none';
    }
    logActivity({
      action: 'costChange',
      target: { type: 'batch', id: batch.id, label: batch.number },
      changes: [
        { field: 'totalCost', from: from.totalCost, to: input.totalCost },
        { field: 'defects', from: from.defects, to: input.defects },
        { field: 'defectHandling', from: from.defectHandling, to: input.defectHandling },
      ],
      flagged: db.settings.flagRules.costChanges,
    });
    return toRow(batch);
  });

export const decideRedistribution = (batchId: Id, approve: boolean, reason?: string) =>
  mutate(() => {
    const batch = findById(db.batches, batchId);
    if (batch.redistribution !== 'pending') throw new ApiError('alreadyDecided');
    batch.redistribution = approve ? 'approved' : 'rejected';
    resolveApprovals('batch', batchId, approve, reason);
    logActivity({ action: approve ? 'approve' : 'reject', target: { type: 'batch', id: batch.id, label: batch.number } });
    return toRow(batch);
  });

// Money or replacement pieces from the brand for defects: lowers the batch's cost again.
export const recordBrandCredit = (batchId: Id, amount: number, note?: string) =>
  mutate(() => {
    const batch = findById(db.batches, batchId);
    batch.brandCredit += amount;
    db.defects.filter((defect) => defect.batchId === batchId && defect.status === 'open' && defect.liability === 'brand').forEach((defect) => (defect.status = 'credited'));
    logActivity({ action: 'update', target: { type: 'batch', id: batch.id, label: batch.number }, changes: [{ field: 'brandCredit', from: batch.brandCredit - amount, to: batch.brandCredit }, ...(note ? [{ field: 'note', from: null, to: note }] : [])], amount, currency: batch.currency });
    return toRow(batch);
  });

// Own brands: a new selling price for the product because of the batch's defects (saved in the price history).
export const setBatchSellingPrice = (batchId: Id, price: number) =>
  mutate(() => {
    const batch = findById(db.batches, batchId);
    const product = findById(db.products, batch.productId);
    const from = product.prices[batch.currency] ?? null;
    product.prices = { ...product.prices, [batch.currency]: price };
    product.pricesSavedAt = { ...product.pricesSavedAt, [batch.currency]: nowIso() };
    batch.sellingPrice = price;
    db.priceChanges.push({ id: newId(), productId: product.id, kind: 'price', currency: batch.currency, from, to: price, at: nowIso(), byId: actor().id });
    logActivity({ action: 'priceChange', target: { type: 'product', id: product.id, label: product.name }, changes: [{ field: batch.currency, from, to: price }], flagged: db.settings.flagRules.priceChanges });
    return toRow(batch);
  });

// ---- Defects ----------------------------------------------------------------------------------------------------

export interface DefectFilter {
  range?: DateRange;
  brandId?: Id;
  branchId?: Id;
  reasonId?: Id;
  batchId?: Id;
}

export const listDefects = (filter: DefectFilter) =>
  respond(() => {
    const { baseCurrency, reportingCurrency } = db.settings;
    const rows = db.defects
      .filter((defect) => {
        const product = db.products.find((current) => current.id === defect.productId);
        return (
          (!filter.range || inRange(defect.at, filter.range)) &&
          (!filter.brandId || product?.brandId === filter.brandId) &&
          (!filter.branchId || defect.branchId === filter.branchId) &&
          (!filter.reasonId || defect.reasonId === filter.reasonId) &&
          (!filter.batchId || defect.batchId === filter.batchId)
        );
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((defect) => {
        const product = db.products.find((current) => current.id === defect.productId);
        const value = convert(defect.unitCost * defect.qty, baseCurrency, reportingCurrency, defect.at, db.rates, baseCurrency);
        return { defect, productName: product?.name ?? '', brandId: product?.brandId ?? '', batchNumber: db.batches.find((batch) => batch.id === defect.batchId)?.number, value };
      });
    // Money impact: what the store absorbs vs what goes back to the brands (credit, replacement or return).
    const absorbed = rows.filter((row) => row.defect.liability === 'store').reduce((sum, row) => sum + row.value, 0);
    const toBrands = rows.filter((row) => row.defect.liability === 'brand').reduce((sum, row) => sum + row.value, 0);
    return { rows, absorbed, toBrands, currency: reportingCurrency, pieces: rows.reduce((sum, row) => sum + row.defect.qty, 0) };
  });

// ---- Write-offs -------------------------------------------------------------------------------------------------

export const listWriteOffs = () =>
  respond(() =>
    db.writeOffs
      .map((writeOff) => {
        const product = db.products.find((current) => current.variants.some((variant) => variant.id === writeOff.variantId));
        const variant = product?.variants.find((current) => current.id === writeOff.variantId);
        return { writeOff, label: product ? `${product.name} · ${variant?.size} · ${variant?.color}` : '' };
      })
      .sort((a, b) => b.writeOff.at.localeCompare(a.writeOff.at)),
  );

// Approving a write-off takes the pieces out of sellable stock (they move to "written off", so the history stays).
export const decideWriteOff = (writeOffId: Id, approve: boolean, reason?: string) =>
  mutate(() => {
    const writeOff = findById(db.writeOffs, writeOffId);
    if (writeOff.status !== 'pending') throw new ApiError('alreadyDecided');
    writeOff.status = approve ? 'approved' : 'rejected';
    writeOff.decidedById = actor().id;
    writeOff.decidedAt = nowIso();
    if (approve) {
      const branch = findById(db.branches, writeOff.branchId);
      const fromStatus = writeOff.kind === 'defective' ? 'defective' : 'available';
      db.movements.push({
        id: newId(),
        at: nowIso(),
        byId: actor().id,
        variantId: writeOff.variantId,
        qty: writeOff.qty,
        from: placeIn(branch, branch.kind === 'store' ? 'floor' : 'storage', fromStatus),
        to: placeIn(branch, branch.kind === 'store' ? 'floor' : 'storage', 'writtenOff'),
        kind: 'writeOff',
        ref: { type: 'writeOff', id: writeOff.id },
        reason,
      });
    }
    resolveApprovals('writeOff', writeOffId, approve, reason);
    logActivity({ action: approve ? 'writeOff' : 'reject', target: { type: 'writeOff', id: writeOff.id, label: String(writeOff.qty) }, branchId: writeOff.branchId, flagged: approve && db.settings.flagRules.writeOffs });
    return writeOff;
  });
