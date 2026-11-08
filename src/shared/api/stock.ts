import { onHandStatuses, stockStatuses } from '@/shared/constants/statuses';
import type { ApprovalState, Id, StockCount, StockStatus, Transfer } from '@/shared/types';
import { daysBetween, nowIso, stockLevels, today } from '@/shared/utils';
import { ApiError } from './errors';
import { resolveApprovals } from './costing';
import { variantIndex } from './engine';
import { stockSummary, type StockSummary } from './facts';
import { lowStockRows } from './dashboard';
import { actor, db, findById, logActivity, mutate, newId, nextNumber, notify, respond } from './server';
import { notifyUsers, staffWithRole } from './branchScope';

// A variant's product, brand, size, colour and SKU, for lists. No prices or costs.
export const describeVariant = (variantId: Id) => {
  const entry = variantIndex(db).get(variantId);
  return entry
    ? { productId: entry.product.id, productName: entry.product.name, brandId: entry.product.brandId, size: entry.variant.size, color: entry.variant.color, sku: entry.variant.sku }
    : { productId: '', productName: '', brandId: '', size: '', color: '', sku: '' };
};

// A variant as one line, for the activity log: 'Linen shirt · M · White'.
export const variantLabel = (variantId: Id) => {
  const info = describeVariant(variantId);
  return [info.productName, info.size, info.color].filter(Boolean).join(' · ');
};

// ---- Levels and value -----------------------------------------------------------------------------------------

export interface StockFilter {
  brandId?: Id;
  query?: string; // product name, SKU or barcode
  size?: string;
  color?: string;
  branchId?: Id;
}

export interface StockRow {
  variantId: Id;
  productId: Id;
  productName: string;
  brandId: Id;
  size: string;
  color: string;
  sku: string;
  byBranch: Record<Id, number>;
  total: number;
}

export const getStockLevels = (filter: StockFilter) =>
  respond(() => {
    const query = filter.query?.trim().toLowerCase() ?? '';
    const variants = db.products
      .filter((product) => !product.archived && (!filter.brandId || product.brandId === filter.brandId) && (!query || product.name.toLowerCase().includes(query) || product.variants.some((variant) => variant.sku.toLowerCase().includes(query) || variant.barcode.includes(query))))
      .flatMap((product) =>
        product.variants
          .filter((variant) => !variant.archived && (!filter.size || variant.size === filter.size) && (!filter.color || variant.color === filter.color))
          .map((variant) => ({ product, variant })),
      );
    const wanted = new Set(variants.map(({ variant }) => variant.id));
    const qty = new Map<string, number>();
    stockLevels(db.movements).forEach((level) => {
      if (!wanted.has(level.variantId) || !onHandStatuses.includes(level.status)) return;
      const key = `${level.variantId}|${level.branchId}`;
      qty.set(key, (qty.get(key) ?? 0) + level.qty);
    });
    const branches = db.branches.filter((branch) => !branch.archived && (!filter.branchId || branch.id === filter.branchId));
    const rows: StockRow[] = variants
      .map(({ product, variant }) => {
        const byBranch = Object.fromEntries(branches.map((branch) => [branch.id, qty.get(`${variant.id}|${branch.id}`) ?? 0]));
        return { variantId: variant.id, productId: product.id, productName: product.name, brandId: product.brandId, size: variant.size, color: variant.color, sku: variant.sku, byBranch, total: Object.values(byBranch).reduce((sum, value) => sum + value, 0) };
      })
      .filter((row) => row.total !== 0);
    return { branchIds: branches.map((branch) => branch.id), rows };
  });

// Pieces and value per branch, per brand and in total, at cost and at selling price.
export const getStockValue = (filter: { brandId?: Id }) =>
  respond(() => {
    const value = stockSummary(db, { brandIds: filter.brandId ? [filter.brandId] : undefined });
    const toList = (map: Map<Id, StockSummary>) => [...map.entries()].map(([id, summary]) => ({ id, ...summary })).sort((a, b) => b.costValue - a.costValue);
    return { currency: db.settings.reportingCurrency, total: value.summary, byBranch: toList(value.byBranch), byBrand: toList(value.byBrand) };
  });

// Pieces in each status (available, reserved, in transit, waiting for inspection, defective...) per branch.
export const getStockByStatus = (filter: { brandId?: Id }) =>
  respond(() => {
    const index = variantIndex(db);
    const counts: Record<StockStatus, Record<Id, number>> = Object.fromEntries(stockStatuses.map((status) => [status, {}])) as Record<StockStatus, Record<Id, number>>;
    stockLevels(db.movements).forEach((level) => {
      if (filter.brandId && index.get(level.variantId)?.product.brandId !== filter.brandId) return;
      counts[level.status][level.branchId] = (counts[level.status][level.branchId] ?? 0) + level.qty;
    });
    return stockStatuses.map((status) => ({ status, byBranch: counts[status], total: Object.values(counts[status]).reduce((sum, value) => sum + value, 0) }));
  });

// Everything that ever happened to one variant: receiving, sales, returns, transfers, adjustments, status changes.
export const getItemHistory = (variantId: Id) =>
  respond(() => {
    const movements = db.movements.filter((movement) => movement.variantId === variantId).sort((a, b) => b.at.localeCompare(a.at));
    const levels = stockLevels(movements).filter((level) => level.qty !== 0);
    const locationName = new Map(db.branches.flatMap((branch) => branch.locations.map((location) => [location.id, location.name] as const)));
    return { ...describeVariant(variantId), movements, levels, locationName: Object.fromEntries(locationName) };
  });

// How long pieces have been in stock without selling: days since the variant first arrived in the branch.
export const getStockAging = (filter: { branchId?: Id; brandId?: Id }) =>
  respond(() => {
    const firstIn = new Map<string, string>();
    db.movements.forEach((movement) => {
      if (movement.kind !== 'receive' && movement.kind !== 'transferIn') return;
      const key = `${movement.variantId}|${movement.to?.branchId}`;
      const current = firstIn.get(key);
      if (!current || movement.at < current) firstIn.set(key, movement.at);
    });
    const lastSold = new Map<string, string>();
    db.movements.forEach((movement) => {
      if (movement.kind !== 'sale') return;
      const key = `${movement.variantId}|${movement.from?.branchId}`;
      if ((lastSold.get(key) ?? '') < movement.at) lastSold.set(key, movement.at);
    });
    const onHand = new Map<string, number>();
    stockLevels(db.movements).forEach((level) => {
      if (level.status !== 'available' || (filter.branchId && level.branchId !== filter.branchId)) return;
      const key = `${level.variantId}|${level.branchId}`;
      onHand.set(key, (onHand.get(key) ?? 0) + level.qty);
    });
    const day = today();
    const rows = [...onHand.entries()]
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [variantId, branchId] = key.split('|');
        const info = describeVariant(variantId);
        const since = firstIn.get(key) ?? day;
        const sold = lastSold.get(key);
        return { variantId, branchId, qty, ...info, days: daysBetween(since, day), daysSinceSale: sold ? daysBetween(sold, day) : null };
      })
      .filter((row) => !filter.brandId || row.brandId === filter.brandId)
      .sort((a, b) => b.days - a.days);
    const buckets = db.settings.agingBuckets;
    const bucketOf = (days: number) => buckets.filter((limit) => days > limit).length; // 0: up to the first limit
    const summary = Array.from({ length: buckets.length + 1 }, (_, index) => ({
      index,
      from: index === 0 ? 0 : buckets[index - 1] + 1,
      to: index < buckets.length ? buckets[index] : null,
      pieces: rows.filter((row) => bucketOf(row.days) === index).reduce((sum, row) => sum + row.qty, 0),
    }));
    return { rows, summary };
  });

export const getLowStock = () =>
  respond(() => lowStockRows().map((row) => ({ ...row, ...describeVariant(row.variantId) })).sort((a, b) => a.qty - b.qty));

// ---- Stock counts -------------------------------------------------------------------------------------------

export const listCounts = () =>
  respond(() =>
    db.counts
      .filter((count): count is StockCount & { status: ApprovalState } => count.status !== 'open') // open: still being counted in the branch
      .map((count) => ({
        count,
        differences: count.lines.filter((line) => line.counted !== line.expected).map((line) => ({ ...line, ...describeVariant(line.variantId), difference: line.counted - line.expected })),
        totalDifference: count.lines.reduce((sum, line) => sum + Math.abs(line.counted - line.expected), 0),
        needsOwner: count.lines.reduce((sum, line) => sum + Math.abs(line.counted - line.expected), 0) > db.settings.stockCountApprovalAbove,
      }))
      .sort((a, b) => b.count.at.localeCompare(a.count.at)),
  );

// Approving a count corrects the stock with an adjustment movement for each difference, with its reason.
export const decideCount = (countId: Id, approve: boolean, reason?: string) =>
  mutate(() => {
    const count = findById(db.counts, countId);
    if (count.status !== 'pending') throw new ApiError('alreadyDecided');
    count.status = approve ? 'approved' : 'rejected';
    count.decidedById = actor().id;
    count.decidedAt = nowIso();
    if (approve) {
      const branch = findById(db.branches, count.branchId);
      const locationId = (branch.locations.find((location) => location.kind === 'floor') ?? branch.locations[0]).id;
      count.lines.forEach((line) => {
        const difference = line.counted - line.expected;
        if (!difference) return;
        const place = { branchId: branch.id, locationId: line.locationId ?? locationId, status: 'available' as const };
        db.movements.push({ id: newId(), at: nowIso(), byId: actor().id, variantId: line.variantId, qty: Math.abs(difference), ...(difference > 0 ? { to: place } : { from: place }), kind: 'adjust', ref: { type: 'count', id: count.id }, reason: line.reasonId });
      });
    }
    resolveApprovals('stockCount', countId, approve, reason);
    logActivity({ action: approve ? 'stockAdjust' : 'reject', target: { type: 'stockCount', id: count.id, label: count.number }, branchId: count.branchId, flagged: approve && db.settings.flagRules.stockAdjustments });
    return count;
  });

// ---- Stock requests ---------------------------------------------------------------------------------------

export const listStockRequests = () =>
  respond(() =>
    db.stockRequests
      .map((request) => ({ request, lines: request.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })) }))
      .sort((a, b) => b.request.at.localeCompare(a.request.at)),
  );

// Approve and send to the warehouse (a transfer is created for the warehouse to prepare), approve and order
// from the brand, or reject. The branch manager is told either way.
export const decideStockRequest = (requestId: Id, decision: 'warehouse' | 'brand' | 'reject', note?: string) =>
  mutate(() => {
    const request = findById(db.stockRequests, requestId);
    if (request.status !== 'pending' && request.status !== 'approved') throw new ApiError('alreadyDecided');
    request.decidedById = actor().id;
    request.decidedAt = nowIso();
    request.note = note;
    if (decision === 'reject') request.status = 'rejected';
    if (decision === 'brand') request.status = 'sentToBrand';
    if (decision === 'warehouse') {
      request.status = 'sentToWarehouse';
      const warehouse = db.branches.find((branch) => (request.fromBranchId ? branch.id === request.fromBranchId : branch.kind === 'warehouse') && !branch.archived);
      if (warehouse) {
        const transfer = { id: newId(), number: nextNumber('TR', 4), fromBranchId: warehouse.id, toBranchId: request.branchId, lines: request.lines.map((line) => ({ ...line })), status: 'approved' as const, requestedById: request.requestedById, createdAt: nowIso(), note: request.number, decidedById: actor().id, decidedAt: nowIso() };
        db.transfers.push(transfer);
        // The warehouse storekeepers prepare a dispatch for it.
        notifyUsers('transferReady', { number: transfer.number, to: findById(db.branches, request.branchId).name }, '/storekeeper/transfers?tab=prepare', staffWithRole('storekeeper', warehouse.id));
      }
    }
    // The manager who asked is told either way.
    notifyUsers('stockRequestDecided', { number: request.number, decision: decision === 'reject' ? 'rejected' : decision, note: note ?? '' }, '/manager/stock?tab=requests', [request.requestedById]);
    resolveApprovals('stockRequest', requestId, decision !== 'reject', note);
    logActivity({ action: decision === 'reject' ? 'reject' : 'approve', target: { type: 'stockRequest', id: request.id, label: request.number }, branchId: request.branchId, changes: [{ field: 'status', from: 'pending', to: request.status }] });
    return request;
  });

// ---- Transfers and signed records ------------------------------------------------------------------------

export interface TransferView {
  transfer: Transfer;
  lines: (Transfer['lines'][number] & ReturnType<typeof describeVariant> & { missing: number; pickupQty: number | null; deliveryQty: number | null })[];
  missing: number;
  inTransit: boolean;
  driverMismatch: boolean; // the driver delivered a different quantity than they picked up
}

export const toTransferView = (transfer: Transfer): TransferView => {
  const lines = transfer.lines.map((line) => {
    const pickupQty = transfer.pickup?.lines.find((signed) => signed.variantId === line.variantId)?.qty ?? null;
    const deliveryQty = transfer.delivery?.lines.find((signed) => signed.variantId === line.variantId)?.qty ?? null;
    return { ...line, ...describeVariant(line.variantId), missing: line.received === undefined ? 0 : Math.max(line.qty - line.received, 0), pickupQty, deliveryQty };
  });
  return {
    transfer,
    lines,
    missing: lines.reduce((sum, line) => sum + line.missing, 0),
    inTransit: transfer.status === 'sent',
    driverMismatch: lines.some((line) => line.pickupQty !== null && line.deliveryQty !== null && line.pickupQty !== line.deliveryQty),
  };
};

export const listTransfers = () => respond(() => [...db.transfers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toTransferView));

// Every signed handover: brand deliveries received by a storekeeper, and drivers' pickups and deliveries.
export const listSignedRecords = () =>
  respond(() => {
    const records = [
      ...db.transfers.flatMap((transfer) =>
        (['pickup', 'delivery', 'receipt'] as const)
          .filter((kind) => transfer[kind])
          .map((kind) => ({ id: `${transfer.id}-${kind}`, kind, document: transfer.number, fromBranchId: transfer.fromBranchId, toBranchId: transfer.toBranchId, signature: transfer[kind]!, lines: transfer[kind]!.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })) })),
      ),
      ...db.receivings.flatMap((receiving) =>
        (['courier', 'storekeeper'] as const)
          .filter((kind) => receiving[kind])
          .map((kind) => ({ id: `${receiving.id}-${kind}`, kind, document: receiving.number, fromBranchId: '', toBranchId: receiving.branchId, signature: receiving[kind]!, lines: receiving[kind]!.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })) })),
      ),
    ];
    return records.sort((a, b) => b.signature.signedAt.localeCompare(a.signature.signedAt));
  });

// When a driver's delivery doesn't match the pickup, the branch manager and the owners are told.
export const flagDriverMismatch = (transfer: Transfer) => {
  const managers = db.users.filter((user) => user.roleIds.includes('role-manager') && user.branchIds.includes(transfer.toBranchId)).map((user) => user.id);
  notify('pickupMismatch', { number: transfer.number }, '/owner/transfers?tab=differences', managers);
};
