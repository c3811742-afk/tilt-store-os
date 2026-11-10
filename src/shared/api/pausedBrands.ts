import { routes, toPath } from '@/shared/constants';
import type { Id, StockStatus } from '@/shared/types';
import { stockLevels, toIsoDate, today } from '@/shared/utils';
import { openBrandReturn } from './brandReturns';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, mutate, notify, ownerIds, respond } from './server';
import { openTransfer } from './transfers';

// A paused brand's stock leaves the store in two steps: every branch sends the brand's pieces to the warehouse, and
// once they are all there the warehouse returns them to the brand. Until then the owners are reminded once a day.

// Pieces a branch still holds for the brand (sellable or defective); pieces on their way are counted apart.
const held: readonly StockStatus[] = ['available', 'reserved', 'defective', 'toReturn', 'pendingInspection'];
const sendable: readonly StockStatus[] = ['available', 'defective'];
const returnable: readonly StockStatus[] = ['available', 'defective', 'toReturn'];

export interface PausedBrandStock {
  brandId: Id;
  brand: string;
  warehouseId: Id | null;
  branches: { branchId: Id; pieces: number; transferPending: boolean }[]; // branches other than the warehouse
  inBranches: number;
  inTransit: number;
  atWarehouse: number;
  step: 'collect' | 'onTheWay' | 'return' | 'done';
}

const mainWarehouse = () => db.branches.find((branch) => branch.kind === 'warehouse' && !branch.archived);

const stockOf = (brandId: Id): PausedBrandStock => {
  const brand = findById(db.brands, brandId);
  const variants = new Set(db.products.filter((product) => product.brandId === brandId).flatMap((product) => product.variants.map((variant) => variant.id)));
  const warehouse = mainWarehouse();
  const byBranch = new Map<Id, number>();
  let inTransit = 0;
  let atWarehouse = 0;
  stockLevels(db.movements.filter((movement) => variants.has(movement.variantId))).forEach((level) => {
    if (level.qty <= 0) return;
    if (level.status === 'inTransit') inTransit += level.qty;
    else if (!held.includes(level.status)) return;
    else if (level.branchId === warehouse?.id) atWarehouse += level.qty;
    else byBranch.set(level.branchId, (byBranch.get(level.branchId) ?? 0) + level.qty);
  });
  // A transfer to the warehouse already made and not yet picked up: the branch has nothing more to do.
  const pending = new Set(db.transfers.filter((transfer) => transfer.toBranchId === warehouse?.id && (transfer.status === 'requested' || transfer.status === 'approved') && transfer.lines.some((line) => variants.has(line.variantId))).map((transfer) => transfer.fromBranchId));
  const branches = [...byBranch.entries()].map(([branchId, pieces]) => ({ branchId, pieces, transferPending: pending.has(branchId) }));
  const inBranches = branches.reduce((sum, row) => sum + row.pieces, 0);
  const step = inBranches ? 'collect' : inTransit ? 'onTheWay' : atWarehouse ? 'return' : 'done';
  return { brandId, brand: brand.name, warehouseId: warehouse?.id ?? null, branches, inBranches, inTransit, atWarehouse, step };
};

const assertOwner = () => {
  if (!isOwner(actor())) throw new ApiError('notAllowed');
};

// Where a paused brand's stock is: for its page and the morning summary.
export const pausedBrandsStock = () => db.brands.filter((brand) => brand.status === 'paused').map((brand) => stockOf(brand.id)).filter((row) => row.step !== 'done');

export const getPausedBrandStock = (brandId: Id) => respond(() => stockOf(brandId));

// One transfer per branch to the warehouse with all of the brand's pieces there (defective ones in their own transfer),
// skipping branches that already have one waiting.
export const collectPausedBrandStock = (brandId: Id) =>
  mutate(() => {
    assertOwner();
    const stock = stockOf(brandId);
    if (!stock.warehouseId) throw new ApiError('notFound');
    const variants = new Set(db.products.filter((product) => product.brandId === brandId).flatMap((product) => product.variants.map((variant) => variant.id)));
    const levels = stockLevels(db.movements.filter((movement) => variants.has(movement.variantId)));
    stock.branches
      .filter((row) => !row.transferPending)
      .forEach((row) =>
        sendable.forEach((status) => {
          const lines = levels.filter((level) => level.branchId === row.branchId && level.status === status && level.qty > 0).map((level) => ({ variantId: level.variantId, qty: level.qty }));
          if (lines.length) openTransfer({ fromBranchId: row.branchId, toBranchId: stock.warehouseId as Id, lines, note: stock.brand, stockStatus: status === 'defective' ? 'defective' : undefined });
        }),
      );
    return stockOf(brandId);
  });

// Once every piece is at the warehouse: one return to the brand with all of them.
export const returnPausedBrandStock = (brandId: Id) =>
  mutate(() => {
    assertOwner();
    const stock = stockOf(brandId);
    if (stock.step !== 'return' || !stock.warehouseId) throw new ApiError('notAllowed');
    const warehouseId = stock.warehouseId;
    const lines = stockLevels(db.movements)
      .filter((level) => level.branchId === warehouseId && returnable.includes(level.status) && level.qty > 0 && db.products.some((product) => product.brandId === brandId && product.variants.some((variant) => variant.id === level.variantId)))
      .map((level) => ({ variantId: level.variantId, locationId: level.locationId, status: level.status, qty: level.qty }));
    return openBrandReturn({ branchId: warehouseId, brandId, lines });
  });

// The daily reminder: a paused brand with stock left gets an alert for its next step, at most once a day.
const remindersDue = () =>
  pausedBrandsStock().filter((row) => (row.step === 'collect' || row.step === 'return') && !db.notifications.some((item) => (item.kind === 'pausedBrandCollect' || item.kind === 'pausedBrandReturn') && item.params.brandId === row.brandId && toIsoDate(new Date(item.at)) === today()));

const sendReminders = () =>
  remindersDue().forEach((row) => {
    const link = toPath(routes.owner.brand, { brandId: row.brandId });
    if (row.step === 'collect') notify('pausedBrandCollect', { brandId: row.brandId, brand: row.brand, pieces: String(row.inBranches), branches: String(row.branches.length) }, link, ownerIds());
    else notify('pausedBrandReturn', { brandId: row.brandId, brand: row.brand, pieces: String(row.atWarehouse) }, link, ownerIds());
  });

// Called before alerts are read. A read: it only counts as a change when a reminder is actually added.
export const remindPausedBrands = async () => {
  if (await respond(() => remindersDue().length > 0)) await mutate(sendReminders);
};
