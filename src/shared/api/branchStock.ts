import { routes } from '@/shared/constants';
import type { Defect, Id, Reservation, StockRequest } from '@/shared/types';
import { nowIso, stockLevels } from '@/shared/utils';
import { sellingPrice } from '@/shared/utils/pricing';
import { addMovement, availableIn, currentUnitCost, placeIn } from './engine';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, notify, respond } from './server';
import { workBranch } from './till';

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
    const branch = workBranch(branchId);
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

const describe = (variantId: Id) => {
  const product = db.products.find((current) => current.variants.some((variant) => variant.id === variantId));
  const variant = product?.variants.find((current) => current.id === variantId);
  return `${product?.name ?? ''} ${variant?.size ?? ''} ${variant?.color ?? ''}`.trim();
};

// Asks another branch to send a piece for a customer. The owner (or the branch manager) approves it, and a
// transfer is created from that branch.
export const requestFromBranch = (input: ForCustomer) =>
  mutate((): StockRequest => {
    const branch = workBranch(input.branchId);
    const from = findById(db.branches, input.fromBranchId);
    const me = actor();
    if (!input.customer.name.trim() || !input.customer.phone.trim()) throw new ApiError('customerRequired');
    if (availableIn(db, input.variantId, from.id) < input.qty) throw new ApiError('outOfStock');
    const request: StockRequest = { id: newId(), number: nextNumber('RQ', 4), branchId: branch.id, requestedById: me.id, at: nowIso(), lines: [{ variantId: input.variantId, qty: input.qty }], status: 'pending', fromBranchId: from.id, customer: input.customer, note: `For ${input.customer.name}, from ${from.name}` };
    db.stockRequests.push(request);
    db.approvals.unshift({ id: newId(), kind: 'stockRequest', level: 'owner', branchId: branch.id, requestedById: me.id, at: request.at, ref: { type: 'stockRequest', id: request.id }, summary: `${request.number}: ${describe(input.variantId)} from ${from.name}`, status: 'pending', channel: 'app' });
    const fromStaff = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.roleIds.includes('role-manager') && user.branchIds.includes(from.id)).map((user) => user.id);
    notify('stockRequest', { number: request.number, branch: branch.name }, routes.owner.approvals, fromStaff);
    logActivity({ action: 'create', target: { type: 'stockRequest', id: request.id, label: request.number }, branchId: branch.id, changes: [{ field: 'from', from: null, to: from.name }] });
    return request;
  });

// Holds pieces in another branch for a customer until the expiry time; they go back on sale after that.
export const reserveInBranch = (input: ForCustomer & { hours: number }) =>
  mutate((): Reservation => {
    releaseExpired();
    const branch = workBranch(input.branchId);
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

// A cashier reports a defective piece from the counter: it leaves the shelf for the back room, with a defect record.
export const reportDefect = (input: { branchId: Id; variantId: Id; qty: number; reasonId: Id; origin: 'received' | 'store'; note?: string }) =>
  mutate((): Defect => {
    const branch = workBranch(input.branchId);
    const me = actor();
    const product = db.products.find((current) => current.variants.some((variant) => variant.id === input.variantId));
    if (!product) throw new ApiError('notFound');
    const levels = stockLevels(db.movements.filter((movement) => movement.variantId === input.variantId));
    const place = levels.filter((level) => level.branchId === branch.id && level.status === 'available' && level.qty >= input.qty).sort((a, b) => b.qty - a.qty)[0];
    if (!place) throw new ApiError('outOfStock');
    const defect: Defect = {
      id: newId(),
      at: nowIso(),
      byId: me.id,
      productId: product.id,
      variantId: input.variantId,
      branchId: branch.id,
      qty: input.qty,
      reasonId: input.reasonId,
      foundAt: input.origin === 'received' ? 'receiving' : 'store',
      liability: input.origin === 'received' ? 'brand' : 'store',
      status: 'open',
      unitCost: currentUnitCost(db, product.id),
      note: input.note,
    };
    db.defects.push(defect);
    addMovement(db, { variantId: input.variantId, qty: input.qty, from: { branchId: place.branchId, locationId: place.locationId, status: 'available' }, to: placeIn(branch, 'backRoom', input.origin === 'received' ? 'toReturn' : 'defective'), kind: 'statusChange', ref: { type: 'defect', id: defect.id }, at: defect.at, byId: me.id }, newId);
    logActivity({ action: 'create', target: { type: 'defect', id: defect.id, label: describe(input.variantId) }, branchId: branch.id, changes: [{ field: 'qty', from: null, to: input.qty }] });
    const managers = db.users.filter((user) => user.status === 'active' && !isOwner(user) && user.roleIds.includes('role-manager') && user.branchIds.includes(branch.id)).map((user) => user.id);
    notify('defectiveReturn', { branch: branch.name, product: product.name }, routes.owner.defects, managers);
    return defect;
  });
