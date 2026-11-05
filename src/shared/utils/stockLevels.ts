import type { Id, StockMovement, StockPlace, StockStatus } from '@/shared/types';

export interface StockLevel extends StockPlace {
  variantId: Id;
  qty: number;
}

const levelKey = (variantId: Id, place: StockPlace) => `${variantId}|${place.branchId}|${place.locationId}|${place.status}`;

// Stock is never stored as a number: it is the sum of every movement in and out of each place.
export const stockLevels = (movements: readonly StockMovement[]): StockLevel[] => {
  const levels = new Map<string, StockLevel>();
  const add = (variantId: Id, place: StockPlace, qty: number) => {
    const key = levelKey(variantId, place);
    const level = levels.get(key) ?? { variantId, ...place, qty: 0 };
    level.qty += qty;
    levels.set(key, level);
  };
  movements.forEach((movement) => {
    if (movement.from) add(movement.variantId, movement.from, -movement.qty);
    if (movement.to) add(movement.variantId, movement.to, movement.qty);
  });
  return [...levels.values()].filter((level) => level.qty !== 0);
};

export interface LevelFilter {
  variantIds?: ReadonlySet<Id>;
  branchIds?: readonly Id[];
  statuses?: readonly StockStatus[];
  locationIds?: readonly Id[];
}

export const filterLevels = (levels: readonly StockLevel[], filter: LevelFilter) =>
  levels.filter(
    (level) =>
      (!filter.variantIds || filter.variantIds.has(level.variantId)) &&
      (!filter.branchIds || filter.branchIds.includes(level.branchId)) &&
      (!filter.statuses || filter.statuses.includes(level.status)) &&
      (!filter.locationIds || filter.locationIds.includes(level.locationId)),
  );

// Pieces of one variant in one place and status (0 when none).
export const qtyAt = (levels: readonly StockLevel[], variantId: Id, branchId: Id, status: StockStatus = 'available') =>
  levels.filter((level) => level.variantId === variantId && level.branchId === branchId && level.status === status).reduce((total, level) => total + level.qty, 0);
