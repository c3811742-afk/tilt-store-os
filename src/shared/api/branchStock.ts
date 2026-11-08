import { routes } from '@/shared/constants';
import { onHandStatuses } from '@/shared/constants/statuses';
import type { Id, Reservation, StockMovement, StockRequest, StockStatus } from '@/shared/types';
import { matchesVariant, nowIso, stockLevels } from '@/shared/utils';
import { sellingPrice } from '@/shared/utils/pricing';
import { addMovement, availableIn, placeIn } from './engine';
import { ApiError } from './errors';
import { assertBranch, hasRole } from './branchScope';
import { checkStockAlerts } from './stockAlerts';
import { lowStockRows } from './dashboard';
import { describeVariant, variantLabel } from './stock';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';

// Stock of one branch for its branch manager and storekeeper: quantities only, never cost or value.
// Other branches show only how many pieces they have available, nothing else.

export interface BranchStockFilter {
  brandId?: Id;
  query?: string; // product name, SKU or barcode
  size?: string;
  color?: string;
  status?: StockStatus; // only items with pieces in this status
}

export interface BranchStockRow extends ReturnType<typeof describeVariant> {
  variantId: Id;
  barcode: string;
  floor: number; // available on the shop floor
  backRoom: number; // available in the back room (or the storage of a warehouse / online store)
  byStatus: Partial<Record<StockStatus, number>>;
  available: number;
  min: number;
  low: boolean; // at or under its minimum
  otherBranches: Record<Id, number>; // available pieces in each other branch, online store and warehouse
}

const sumBy = <T,>(list: readonly T[], value: (item: T) => number) => list.reduce((sum, item) => sum + value(item), 0);

// Pieces of each variant per branch, location and status, from the movements.
const levelsFor = (movements: readonly StockMovement[] = db.movements) => stockLevels(movements);

export const minFor = (variantId: Id, branchId: Id) => db.minQty[`${variantId}|${branchId}`] ?? db.settings.lowStockDefault;

export const getBranchStock = (branchId: Id, filter: BranchStockFilter) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const query = filter.query?.trim().toLowerCase() ?? '';
    const levels = levelsFor();
    const floorIds = new Set(branch.locations.filter((location) => location.kind === 'floor').map((location) => location.id));
    const otherIds = db.branches.filter((other) => !other.archived && other.id !== branchId).map((other) => other.id);
    const brandName = (id: Id) => db.brands.find((brand) => brand.id === id)?.name ?? '';

    const here = new Map<Id, typeof levels>();
    const elsewhere = new Map<Id, Record<Id, number>>();
    levels.forEach((level) => {
      if (level.branchId === branchId) {
        const list = here.get(level.variantId) ?? [];
        list.push(level);
        here.set(level.variantId, list);
      } else if (level.status === 'available') {
        const map = elsewhere.get(level.variantId) ?? {};
        map[level.branchId] = (map[level.branchId] ?? 0) + level.qty;
        elsewhere.set(level.variantId, map);
      }
    });

    const rows: BranchStockRow[] = db.products
      .filter((product) => !product.archived && (!filter.brandId || product.brandId === filter.brandId))
      .flatMap((product) =>
        product.variants
          .filter((variant) => !variant.archived && (!filter.size || variant.size === filter.size) && (!filter.color || variant.color === filter.color))
          .filter((variant) => matchesVariant(query, { ...variant, name: product.name }))
          .map((variant) => ({ variant, list: here.get(variant.id) ?? [] })),
      )
      .filter(({ list }) => list.length > 0)
      .map(({ variant, list }) => {
        const byStatus: Partial<Record<StockStatus, number>> = {};
        list.forEach((level) => (byStatus[level.status] = (byStatus[level.status] ?? 0) + level.qty));
        const availableLevels = list.filter((level) => level.status === 'available');
        const floor = sumBy(availableLevels.filter((level) => floorIds.has(level.locationId)), (level) => level.qty);
        const available = sumBy(availableLevels, (level) => level.qty);
        const min = minFor(variant.id, branchId);
        const others = elsewhere.get(variant.id) ?? {};
        return {
          ...describeVariant(variant.id),
          variantId: variant.id,
          barcode: variant.barcode,
          floor,
          backRoom: available - floor,
          byStatus,
          available,
          min,
          low: available <= min,
          otherBranches: Object.fromEntries(otherIds.map((id) => [id, others[id] ?? 0])),
        };
      })
      .filter((row) => !filter.status || (row.byStatus[filter.status] ?? 0) > 0)
      .sort((a, b) => brandName(a.brandId).localeCompare(brandName(b.brandId)) || a.productName.localeCompare(b.productName) || a.size.localeCompare(b.size) || a.color.localeCompare(b.color));

    return { branchId, otherBranchIds: otherIds, rows };
  });

// Items at or under their minimum in the branch, out of stock first.
export const getBranchLowStock = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return lowStockRows()
      .filter((row) => row.branchId === branchId)
      .map((row) => ({ ...row, ...describeVariant(row.variantId) }))
      .sort((a, b) => a.qty - b.qty || a.productName.localeCompare(b.productName));
  });

// Pieces of each status in the branch, for the status summary.
export const getBranchStatusTotals = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const totals: Partial<Record<StockStatus, number>> = {};
    levelsFor().forEach((level) => {
      if (level.branchId === branchId) totals[level.status] = (totals[level.status] ?? 0) + level.qty;
    });
    return totals;
  });

export type BranchItemHistoryData = Awaited<ReturnType<typeof getBranchItemHistory>>;

// One item's movements in and out of the branch, newest first, and where its pieces are now.
// Pieces in other branches show as available quantities only.
export const getBranchItemHistory = (branchId: Id, variantId: Id) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const info = describeVariant(variantId);
    if (!info.productId) throw new ApiError('notFound');
    const all = db.movements.filter((movement) => movement.variantId === variantId);
    const movements = all.filter((movement) => movement.from?.branchId === branchId || movement.to?.branchId === branchId).sort((a, b) => b.at.localeCompare(a.at));
    const levels = levelsFor(all);
    const locationName = Object.fromEntries(branch.locations.map((location) => [location.id, location.name]));
    const here = levels.filter((level) => level.branchId === branchId && onHandStatuses.concat('inTransit').includes(level.status));
    const otherBranches: Record<Id, number> = {};
    levels.forEach((level) => {
      if (level.branchId !== branchId && level.status === 'available') otherBranches[level.branchId] = (otherBranches[level.branchId] ?? 0) + level.qty;
    });
    return { ...info, variantId, movements, here, locationName, otherBranches, min: minFor(variantId, branchId) };
  });

// ---- New stock requests -------------------------------------------------------------------------------------

export interface StockRequestInput {
  branchId: Id;
  lines: { variantId: Id; qty: number }[];
  note?: string;
}

// A branch manager asks for new stock. The owner decides: from the warehouse, ordered from the brand, or not.
export const requestNewStock = (input: StockRequestInput) =>
  mutate(() => {
    const branch = assertBranch(input.branchId);
    const lines = input.lines.filter((line) => line.qty > 0);
    if (!lines.length) throw new ApiError('notAllowed');
    const me = actor();
    const request: StockRequest = { id: newId(), number: nextNumber('SR', 4), branchId: branch.id, requestedById: me.id, at: nowIso(), lines, status: 'pending', note: input.note };
    db.stockRequests.push(request);
    db.approvals.push({ id: newId(), kind: 'stockRequest', level: 'owner', status: 'pending', branchId: branch.id, requestedById: me.id, at: request.at, ref: { type: 'stockRequest', id: request.id }, summary: request.number });
    notify('stockRequest', { branch: branch.name, number: request.number }, '/owner/stock?tab=requests');
    logActivity({ action: 'create', target: { type: 'stockRequest', id: request.id, label: request.number }, branchId: branch.id });
    return request;
  });

// The branch's own stock requests, newest first, with what was asked for.
export const listBranchStockRequests = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    return db.stockRequests
      .filter((request) => request.branchId === branchId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((request) => ({ request, lines: request.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })) }));
  });

// One size and colour of a product, as lists show it. No prices or costs.
// ---- Storekeeper actions on an item ---------------------------------------------------------------------------
// Quantities are never typed in: each action below records a movement, so the history explains every piece.

const assertStockStaff = (branchId: Id) => {
  const me = actor();
  assertBranch(branchId, me);
  if (!isOwner(me) && !hasRole(me, 'storekeeper') && !hasRole(me, 'manager')) throw new ApiError('notAllowed');
  return me;
};

const piecesAt = (variantId: Id, branchId: Id, locationId: Id, status: StockStatus) =>
  stockLevels(db.movements.filter((movement) => movement.variantId === variantId))
    .filter((level) => level.branchId === branchId && level.locationId === locationId && level.status === status)
    .reduce((sum, level) => sum + level.qty, 0);

// Statuses a storekeeper may set by hand. In transit only comes from a transfer; written off goes through a
// write-off request the owner approves.
export const settableStatuses: readonly StockStatus[] = ['available', 'reserved', 'pendingInspection', 'defective', 'repairable', 'toReturn', 'returned'];

export interface StatusChangeInput {
  branchId: Id;
  variantId: Id;
  locationId: Id;
  from: StockStatus;
  to: StockStatus;
  qty: number;
  note?: string;
}

export const setItemStatus = (input: StatusChangeInput) =>
  mutate(() => {
    const me = assertStockStaff(input.branchId);
    const qty = Math.floor(input.qty);
    if (qty < 1 || input.from === input.to || !settableStatuses.includes(input.to)) throw new ApiError('notAllowed');
    if (piecesAt(input.variantId, input.branchId, input.locationId, input.from) < qty) throw new ApiError('notEnoughStock');
    const from = { branchId: input.branchId, locationId: input.locationId, status: input.from };
    db.movements.push({ id: newId(), at: nowIso(), byId: me.id, variantId: input.variantId, qty, from, to: { ...from, status: input.to }, kind: 'statusChange', reason: input.note });
    logActivity({ action: 'update', target: { type: 'stock', id: input.variantId, label: variantLabel(input.variantId) }, branchId: input.branchId, changes: [{ field: 'status', from: input.from, to: input.to }] });
    if (input.from === 'available') checkStockAlerts(input.branchId, [input.variantId]);
    return { qty };
  });

export interface MoveInput {
  branchId: Id;
  variantId: Id;
  fromLocationId: Id;
  toLocationId: Id;
  qty: number;
}

// Moves available pieces between the back room and the shop floor.
export const moveItem = (input: MoveInput) =>
  mutate(() => {
    const me = assertStockStaff(input.branchId);
    const branch = findById(db.branches, input.branchId);
    const qty = Math.floor(input.qty);
    const places = new Set(branch.locations.map((location) => location.id));
    if (qty < 1 || input.fromLocationId === input.toLocationId || !places.has(input.fromLocationId) || !places.has(input.toLocationId)) throw new ApiError('notAllowed');
    if (piecesAt(input.variantId, input.branchId, input.fromLocationId, 'available') < qty) throw new ApiError('notEnoughStock');
    db.movements.push({
      id: newId(),
      at: nowIso(),
      byId: me.id,
      variantId: input.variantId,
      qty,
      from: { branchId: branch.id, locationId: input.fromLocationId, status: 'available' },
      to: { branchId: branch.id, locationId: input.toLocationId, status: 'available' },
      kind: 'move',
    });
    checkStockAlerts(branch.id, [input.variantId]);
    return { qty };
  });

// The minimum a branch keeps of an item; at or under it, the item is low and the staff are told.
export const setMinQty = (branchId: Id, variantId: Id, min: number) =>
  mutate(() => {
    assertStockStaff(branchId);
    const value = Math.floor(min);
    if (!(value >= 0)) throw new ApiError('notAllowed');
    const key = `${variantId}|${branchId}`;
    const before = db.minQty[key] ?? db.settings.lowStockDefault;
    db.minQty[key] = value;
    logActivity({ action: 'update', target: { type: 'stock', id: variantId, label: describeVariant(variantId).productName }, branchId, changes: [{ field: 'minimum', from: before, to: value }] });
    return { min: value };
  });

// How many pieces each brand has in the branch, by status.
export const getBranchBrandTotals = (branchId: Id) =>
  respond(() => {
    assertBranch(branchId);
    const brandOf = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, product.brandId] as const)));
    const totals = new Map<Id, { available: number; onHand: number; byStatus: Partial<Record<StockStatus, number>> }>();
    levelsFor().forEach((level) => {
      if (level.branchId !== branchId) return;
      const brandId = brandOf.get(level.variantId) ?? '';
      const row = totals.get(brandId) ?? { available: 0, onHand: 0, byStatus: {} };
      row.byStatus[level.status] = (row.byStatus[level.status] ?? 0) + level.qty;
      if (level.status === 'available') row.available += level.qty;
      if (onHandStatuses.includes(level.status)) row.onHand += level.qty;
      totals.set(brandId, row);
    });
    return [...totals.entries()].map(([brandId, row]) => ({ brandId, ...row })).filter((row) => row.onHand > 0).sort((a, b) => b.onHand - a.onHand);
  });

// ---- The counter: one item across branches, and what a cashier does for a customer -------------------------

// Stock as the counter sees it: one item's sizes and colours here (floor and back room), the quantity in the other
// branches and online, and the actions a cashier takes for a customer: request, reserve, report a defect.

// Reservations past their time go back on sale, dated when they expired.
const releaseExpired = () => {
  const now = nowIso();
  db.reservations
    .filter((reservation) => reservation.status === 'active' && reservation.expiresAt <= now)
    .forEach((reservation) => {
      const branch = db.branches.find((current) => current.id === reservation.branchId);
      if (!branch) return;
      reservation.status = 'released';
      reservation.closedAt = reservation.expiresAt;
      const held = db.movements.find((movement) => movement.ref?.type === 'reservation' && movement.ref.id === reservation.id);
      const place = held?.to ?? placeIn(branch, 'floor', 'reserved');
      addMovement(db, { variantId: reservation.variantId, qty: reservation.qty, from: place, to: { ...place, status: 'available' }, kind: 'statusChange', ref: { type: 'reservation', id: reservation.id }, reason: 'expired', at: reservation.expiresAt, byId: reservation.byId }, newId);
    });
};

export interface ItemVariantStock {
  variantId: Id;
  size: string;
  color: string;
  sku: string;
  floor: number;
  backRoom: number;
  reserved: number; // held here for customers
  elsewhere: { branchId: Id; name: string; kind: string; qty: number }[]; // other branches and online: quantity only
}

export interface ItemStock {
  productId: Id;
  name: string;
  brandName: string;
  photo?: string;
  price: number | null;
  currency: string;
  sizes: string[];
  colors: string[];
  variants: ItemVariantStock[];
  reservations: (Reservation & { size: string; color: string; branchName: string })[];
}

// One item in a branch: every size and colour, where it is, and how many the other branches have.
export const getItemStock = (branchId: Id, productId: Id) =>
  respond((): ItemStock => {
    releaseExpired(); // saved with the next change; the dates are those of the expiry
    const branch = assertBranch(branchId);
    const product = findById(db.products, productId);
    if (actor().brandId && actor().brandId !== product.brandId) throw new ApiError('notAllowed');
    const variantIds = new Set(product.variants.map((variant) => variant.id));
    const levels = stockLevels(db.movements.filter((movement) => variantIds.has(movement.variantId)));
    const kinds = new Map(db.branches.flatMap((current) => current.locations.map((location) => [location.id, location.kind] as const)));
    const others = db.branches.filter((current) => current.id !== branch.id && current.kind !== 'warehouse' && !current.archived);
    const variants = product.variants.filter((variant) => !variant.archived);
    const at = (variantId: Id, branchIdHere: Id, status: string, kind?: string) =>
      levels.filter((level) => level.variantId === variantId && level.branchId === branchIdHere && level.status === status && (!kind || kinds.get(level.locationId) === kind)).reduce((sum, level) => sum + level.qty, 0);
    return {
      productId: product.id,
      name: product.name,
      brandName: db.brands.find((brand) => brand.id === product.brandId)?.name ?? '',
      photo: product.photo,
      price: sellingPrice(db.schedules, product, undefined, branch.currency, nowIso()) ?? null,
      currency: branch.currency,
      sizes: [...new Set(variants.map((variant) => variant.size))],
      colors: [...new Set(variants.map((variant) => variant.color))],
      variants: variants.map((variant) => ({
        variantId: variant.id,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        floor: at(variant.id, branch.id, 'available', 'floor'),
        backRoom: at(variant.id, branch.id, 'available', 'backRoom'),
        reserved: at(variant.id, branch.id, 'reserved'),
        elsewhere: others.map((other) => ({ branchId: other.id, name: other.name, kind: other.kind, qty: at(variant.id, other.id, 'available') })),
      })),
      reservations: db.reservations
        .filter((reservation) => variantIds.has(reservation.variantId) && (reservation.forBranchId === branch.id || reservation.branchId === branch.id))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 20)
        .map((reservation) => {
          const variant = product.variants.find((current) => current.id === reservation.variantId);
          return { ...reservation, size: variant?.size ?? '', color: variant?.color ?? '', branchName: db.branches.find((current) => current.id === reservation.branchId)?.name ?? '' };
        }),
    };
  });

interface ForCustomer {
  branchId: Id; // where the cashier is
  variantId: Id;
  qty: number;
  fromBranchId: Id;
  customer: { name: string; phone: string };
}

// Asks another branch to send a piece for a customer. The owner (or the branch manager) approves it, and a
// transfer is created from that branch.
export const requestFromBranch = (input: ForCustomer) =>
  mutate((): StockRequest => {
    const branch = assertBranch(input.branchId);
    const from = findById(db.branches, input.fromBranchId);
    const me = actor();
    if (!input.customer.name.trim() || !input.customer.phone.trim()) throw new ApiError('customerRequired');
    if (availableIn(db, input.variantId, from.id) < input.qty) throw new ApiError('outOfStock');
    const request: StockRequest = { id: newId(), number: nextNumber('RQ', 4), branchId: branch.id, requestedById: me.id, at: nowIso(), lines: [{ variantId: input.variantId, qty: input.qty }], status: 'pending', fromBranchId: from.id, customer: input.customer, note: `For ${input.customer.name}, from ${from.name}` };
    db.stockRequests.push(request);
    db.approvals.unshift({ id: newId(), kind: 'stockRequest', level: 'owner', branchId: branch.id, requestedById: me.id, at: request.at, ref: { type: 'stockRequest', id: request.id }, summary: `${request.number}: ${variantLabel(input.variantId)} from ${from.name}`, status: 'pending', channel: 'app' });
    const fromStaff = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.roleIds.includes('role-manager') && user.branchIds.includes(from.id)).map((user) => user.id);
    notify('stockRequest', { number: request.number, branch: branch.name }, routes.owner.approvals, fromStaff);
    logActivity({ action: 'create', target: { type: 'stockRequest', id: request.id, label: request.number }, branchId: branch.id, changes: [{ field: 'from', from: null, to: from.name }] });
    return request;
  });

// Holds pieces in another branch for a customer until the expiry time; they go back on sale after that.
export const reserveInBranch = (input: ForCustomer & { hours: number }) =>
  mutate((): Reservation => {
    releaseExpired();
    const branch = assertBranch(input.branchId);
    const from = findById(db.branches, input.fromBranchId);
    if (!input.customer.name.trim() || !input.customer.phone.trim()) throw new ApiError('customerRequired');
    const levels = stockLevels(db.movements.filter((movement) => movement.variantId === input.variantId));
    const place = levels.filter((level) => level.branchId === from.id && level.status === 'available' && level.qty >= input.qty).sort((a, b) => b.qty - a.qty)[0];
    if (!place) throw new ApiError('outOfStock');
    const at = nowIso();
    const reservation: Reservation = {
      id: newId(),
      number: nextNumber('RS', 4),
      variantId: input.variantId,
      qty: input.qty,
      branchId: from.id,
      forBranchId: branch.id,
      customer: input.customer,
      byId: actor().id,
      at,
      expiresAt: new Date(Date.now() + input.hours * 3_600_000).toISOString(),
      status: 'active',
    };
    db.reservations.push(reservation);
    const fromPlace = { branchId: place.branchId, locationId: place.locationId, status: place.status };
    addMovement(db, { variantId: input.variantId, qty: input.qty, from: fromPlace, to: { ...fromPlace, status: 'reserved' }, kind: 'statusChange', ref: { type: 'reservation', id: reservation.id }, reason: input.customer.name, at, byId: actor().id }, newId);
    logActivity({ action: 'create', target: { type: 'reservation', id: reservation.id, label: reservation.number }, branchId: from.id, changes: [{ field: 'until', from: null, to: reservation.expiresAt }] });
    return reservation;
  });

// Ends a reservation early: the piece goes back on sale, or the customer collected it.
export const closeReservation = (reservationId: Id, collected: boolean) =>
  mutate(() => {
    const reservation = findById(db.reservations, reservationId);
    const me = actor();
    if (reservation.status !== 'active') throw new ApiError('alreadyDecided');
    if (!isOwner(me) && !me.branchIds.includes(reservation.branchId) && !me.branchIds.includes(reservation.forBranchId)) throw new ApiError('notAllowed');
    reservation.status = collected ? 'collected' : 'released';
    reservation.closedAt = nowIso();
    if (!collected) {
      const held = db.movements.find((movement) => movement.ref?.type === 'reservation' && movement.ref.id === reservation.id);
      if (held?.to) addMovement(db, { variantId: reservation.variantId, qty: reservation.qty, from: held.to, to: { ...held.to, status: 'available' }, kind: 'statusChange', ref: { type: 'reservation', id: reservation.id }, at: reservation.closedAt, byId: me.id }, newId);
    }
    logActivity({ action: 'update', target: { type: 'reservation', id: reservation.id, label: reservation.number }, branchId: reservation.branchId, changes: [{ field: 'status', from: 'active', to: reservation.status }] });
    return reservation;
  });
