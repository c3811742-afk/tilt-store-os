import { mockConfig } from '@/shared/constants';
import type { Branch, Id, LocationKind, OnlineOrder, OnlineOrderStatus, SaleReturn, StockPlace } from '@/shared/types';
import { createRandom, matchesVariant, nowIso, sellingPrice, stockLevels } from '@/shared/utils';
import type { Database } from './database';
import { ApiError } from './errors';
import { hasRole } from './branchScope';
import { placeIn, recordSale } from './engine';
import { describeVariant } from './stock';
import { checkStockAlerts } from './stockAlerts';
import { actor, db, findById, isOwner, logActivity, mutate, newId, nextNumber, respond } from './server';

// Orders from the online store, for the online orders staff. An order reserves its pieces where it ships from as
// soon as it is placed (online stock first, then the store or warehouse with the most), so the website and the
// stores never sell the same piece twice. Shipping records the sale; a cancelled order puts the pieces back on
// sale; a returned order sends them to "waiting for inspection" where they were shipped from.

const fulfilKinds: Record<Branch['kind'], LocationKind> = { online: 'storage', warehouse: 'storage', store: 'backRoom' };

const assertOnlineStaff = () => {
  const me = actor();
  if (!isOwner(me) && !hasRole(me, 'online')) throw new ApiError('notAllowed');
  return me;
};

// Available pieces of a variant at every place, for picking where an order ships from.
const availablePlaces = (data: Database, variantId: Id) =>
  stockLevels(data.movements.filter((movement) => movement.variantId === variantId)).filter((level) => level.status === 'available' && level.qty > 0);

// Where an order ships from: the online stock if it has every piece, otherwise the store or warehouse that does.
export const pickFulfilment = (data: Database, lines: readonly { variantId: Id; qty: number }[]) => {
  const candidates = data.branches.filter((branch) => !branch.archived && branch.countryCode === 'EG').sort((a, b) => Number(b.kind === 'online') - Number(a.kind === 'online') || Number(b.kind === 'warehouse') - Number(a.kind === 'warehouse'));
  return candidates.find((branch) => lines.every((line) => availablePlaces(data, line.variantId).filter((level) => level.branchId === branch.id).reduce((sum, level) => sum + level.qty, 0) >= line.qty));
};

// Moves pieces of a variant at a branch from one status to another, taking them from wherever they are.
const shiftStatus = (data: Database, order: OnlineOrder, variantId: Id, qty: number, from: StockPlace['status'], to: StockPlace['status'] | null, kind: 'statusChange' | 'sale', byId: Id, at: string, saleId?: Id) => {
  let left = qty;
  stockLevels(data.movements.filter((movement) => movement.variantId === variantId))
    .filter((level) => level.branchId === order.fulfilBranchId && level.status === from && level.qty > 0)
    .forEach((level) => {
      const take = Math.min(level.qty, left);
      if (take <= 0) return;
      left -= take;
      const place = { branchId: level.branchId, locationId: level.locationId, status: from };
      data.movements.push({ id: newId(), at, byId, variantId, qty: take, from: place, ...(to ? { to: { ...place, status: to } } : {}), kind, ref: saleId ? { type: 'sale', id: saleId } : { type: 'onlineOrder', id: order.id } });
    });
  if (left > 0) throw new ApiError('notEnoughStock');
};

export interface PlaceOrderInput {
  customer: OnlineOrder['customer'];
  lines: { variantId: Id; qty: number }[];
  methodId: Id;
  at: string;
  byId: Id; // who the reservation is recorded for (the website's system user in the demo)
}

// Places an order and reserves its pieces. Used by the website feed and the seed.
export const placeOrderIn = (data: Database, input: PlaceOrderInput): OnlineOrder => {
  const online = data.branches.find((branch) => branch.kind === 'online' && !branch.archived);
  if (!online) throw new ApiError('notFound');
  const fulfil = pickFulfilment(data, input.lines);
  if (!fulfil) throw new ApiError('notEnoughStock');
  const index = new Map(data.products.flatMap((product) => product.variants.map((variant) => [variant.id, { product, variant }] as const)));
  const order: OnlineOrder = {
    id: newId(),
    number: nextNumberIn(data, 'W'),
    at: input.at,
    customer: input.customer,
    lines: input.lines.map((line) => {
      const entry = index.get(line.variantId);
      return { variantId: line.variantId, qty: line.qty, unitPrice: entry ? (sellingPrice(data.schedules, entry.product, entry.variant, online.currency, input.at) ?? 0) : 0 };
    }),
    currency: online.currency,
    methodId: input.methodId,
    paid: input.methodId !== 'pm-cod',
    paidAt: input.methodId !== 'pm-cod' ? input.at : undefined,
    status: 'new',
    fulfilBranchId: fulfil.id,
    returns: [],
  };
  order.lines.forEach((line) => shiftStatus(data, order, line.variantId, line.qty, 'available', 'reserved', 'statusChange', input.byId, input.at));
  data.onlineOrders.push(order);
  return order;
};

// The next document number in `data` (the seed builds its data before the live database exists).
const nextNumberIn = (data: Database, kind: string, digits = 5) => {
  data.counters[kind] = (data.counters[kind] ?? 0) + 1;
  return `${kind}-${String(data.counters[kind]).padStart(digits, '0')}`;
};

// ---- The simulated website ------------------------------------------------------------------------------------

const firstNames = ['Nour', 'Youssef', 'Malak', 'Omar', 'Jana', 'Seif', 'Farah', 'Ali', 'Habiba', 'Karim'];
const lastNames = ['Hassan', 'Mahmoud', 'Ibrahim', 'Fathy', 'Sherif', 'Kamal', 'Saad', 'Nabil'];
const cities = ['Cairo', 'Giza', 'New Cairo', 'Sheikh Zayed', 'Alexandria', '6th of October'];

// A believable order from the website: one to three pieces in stock somewhere in Egypt. Names are placeholders.
export const randomOrderInput = (data: Database, seed: number, at: string, byId: Id): PlaceOrderInput | null => {
  const random = createRandom(seed);
  const online = data.branches.find((branch) => branch.kind === 'online');
  const priced = data.products.filter((product) => !product.archived && online && product.prices[online.currency]);
  const lines: PlaceOrderInput['lines'] = [];
  for (let attempt = 0; attempt < 40 && lines.length < random.int(1, 3); attempt += 1) {
    const product = random.pick(priced);
    const variant = product && random.pick(product.variants.filter((current) => !current.archived));
    if (variant && !lines.some((line) => line.variantId === variant.id) && pickFulfilment(data, [...lines, { variantId: variant.id, qty: 1 }])) lines.push({ variantId: variant.id, qty: 1 });
  }
  if (!lines.length) return null;
  const name = `${random.pick(firstNames)} ${random.pick(lastNames)}`;
  return {
    customer: { name, phone: `010${String(random.int(10000000, 99999999))}`, address: `${random.int(1, 90)} ${random.pick(['El Nasr St', 'Road 9', 'Gamal Abdel Nasser St', 'El Tahrir St'])}`, city: random.pick(cities) },
    lines,
    methodId: random.pick(['pm-card', 'pm-cod', 'pm-cod', 'pm-instapay', 'pm-wallet']),
    at,
    byId,
  };
};

const websiteUser = (data: Database) => data.users.find((user) => user.roleIds.includes('role-online'))?.id ?? data.users[0]?.id ?? '';

// A new order from the website now. Used by the demo's timer and the "Simulate order" button.
export const simulateOnlineOrder = () =>
  mutate(() => {
    const input = randomOrderInput(db, Date.now(), nowIso(), websiteUser(db));
    if (!input) throw new ApiError('notEnoughStock');
    const order = placeOrderIn(db, input);
    logActivity({ action: 'create', target: { type: 'sale', id: order.id, label: order.number }, branchId: order.fulfilBranchId, userId: input.byId });
    checkStockAlerts(order.fulfilBranchId, order.lines.map((line) => line.variantId));
    return order;
  });

let feedStarted = false;

// New website orders arrive on their own while the demo is open (mockConfig.onlineOrderEveryMs; 0 turns it off).
export const startOnlineOrderFeed = () => {
  if (feedStarted || !mockConfig.onlineOrderEveryMs) return;
  feedStarted = true;
  setInterval(() => {
    // A failed simulated order (e.g. nothing left in stock, a mock network error) is skipped until the next tick.
    simulateOnlineOrder().catch((error: unknown) => console.error(error));
  }, mockConfig.onlineOrderEveryMs);
};

// ---- Orders for the online orders staff --------------------------------------------------------------------------

export interface OnlineOrderView {
  order: OnlineOrder;
  lines: (OnlineOrder['lines'][number] & ReturnType<typeof describeVariant>)[];
  total: number;
  fulfilLocationId: Id; // the room or storage the pieces are reserved in
}

const toView = (order: OnlineOrder): OnlineOrderView => {
  const branch = db.branches.find((current) => current.id === order.fulfilBranchId);
  return {
    order,
    lines: order.lines.map((line) => ({ ...line, ...describeVariant(line.variantId) })),
    total: order.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    fulfilLocationId: branch ? (branch.locations.find((location) => location.kind === fulfilKinds[branch.kind]) ?? branch.locations[0])?.id ?? '' : '',
  };
};

export const listOnlineOrders = () =>
  respond(() => {
    assertOnlineStaff();
    return [...db.onlineOrders].sort((a, b) => b.at.localeCompare(a.at)).map(toView);
  });

export const getOnlineOrder = (orderId: Id) =>
  respond(() => {
    assertOnlineStaff();
    return toView(findById(db.onlineOrders, orderId));
  });

const step = (orderId: Id, allowed: readonly OnlineOrderStatus[], change: (order: OnlineOrder, me: ReturnType<typeof actor>, at: string) => void) =>
  mutate(() => {
    const me = assertOnlineStaff();
    const order = findById(db.onlineOrders, orderId);
    if (!allowed.includes(order.status)) throw new ApiError('alreadyDecided');
    const at = nowIso();
    const before = order.status;
    change(order, me, at);
    logActivity({ action: 'update', target: { type: 'sale', id: order.id, label: order.number }, branchId: order.fulfilBranchId, changes: [{ field: 'status', from: before, to: order.status }] });
    return toView(order);
  });

export const markOrderPacked = (orderId: Id) =>
  step(orderId, ['new'], (order, me, at) => Object.assign(order, { status: 'packed', packedAt: at, packedById: me.id }));

// Ships an order: records the sale (in the online store's sales) and the reserved pieces leave stock.
export const shipOrderIn = (data: Database, order: OnlineOrder, byId: Id, at: string, trackingNumber?: string) => {
  const online = data.branches.find((branch) => branch.kind === 'online');
  if (!online) throw new ApiError('notFound');
  const sale = recordSale(data, {
    branchId: online.id,
    cashierId: byId,
    at,
    items: order.lines.map((line) => ({ variantId: line.variantId, qty: line.qty })),
    payments: [{ methodId: order.methodId, share: 1 }],
    newId,
    number: nextNumberIn(data, 'S', 6),
    availableAt: () => 0,
  });
  // recordSale takes stock from the online store itself; the pieces really leave from where they were reserved.
  data.movements = data.movements.filter((movement) => !(movement.kind === 'sale' && movement.ref?.id === sale.id));
  order.lines.forEach((line) => shiftStatus(data, order, line.variantId, line.qty, 'reserved', null, 'sale', byId, at, sale.id));
  Object.assign(order, { status: 'shipped', shippedAt: at, shippedById: byId, trackingNumber: trackingNumber?.trim() || undefined, saleId: sale.id });
};

export const markOrderShipped = (orderId: Id, trackingNumber?: string) => step(orderId, ['packed'], (order, me, at) => shipOrderIn(db, order, me.id, at, trackingNumber));

export const markOrderDelivered = (orderId: Id) => step(orderId, ['shipped'], (order, _me, at) => Object.assign(order, { status: 'delivered', deliveredAt: at }));

// A cash-on-delivery order is paid when the courier hands over the cash.
export const markOrderPaid = (orderId: Id) =>
  step(orderId, ['shipped', 'delivered'], (order, me, at) => {
    if (order.paid) throw new ApiError('alreadyDecided');
    Object.assign(order, { paid: true, paidAt: at, paidById: me.id });
  });

// Cancelling an order before it ships puts its reserved pieces back on sale.
export const cancelOnlineOrder = (orderId: Id, reasonId: Id) =>
  step(orderId, ['new', 'packed'], (order, me, at) => {
    if (!reasonId) throw new ApiError('missingReason');
    order.lines.forEach((line) => shiftStatus(db, order, line.variantId, line.qty, 'reserved', 'available', 'statusChange', me.id, at));
    Object.assign(order, { status: 'cancelled', cancelledAt: at, cancelledById: me.id, cancelReasonId: reasonId });
  });

export interface OnlineReturnInput {
  lines: { variantId: Id; qty: number }[];
  reasonId: Id;
}

// A customer sends back some or all of a shipped order. The pieces wait for inspection where the order shipped from,
// the refund is recorded against the sale (for paid orders), and the order is returned once every piece is back.
export const returnOnlineOrder = (orderId: Id, input: OnlineReturnInput) =>
  step(orderId, ['shipped', 'delivered'], (order, me, at) => {
    if (!input.reasonId) throw new ApiError('missingReason');
    const sale = db.sales.find((current) => current.id === order.saleId);
    const branch = findById(db.branches, order.fulfilBranchId);
    // Only items on the order, and never more than is left to return.
    const lines = input.lines
      .map((line) => ({ orderLine: order.lines.find((current) => current.variantId === line.variantId), qty: Math.floor(line.qty) }))
      .filter((line) => line.qty !== 0);
    if (lines.some((line) => !line.orderLine || line.qty < 0 || line.qty > line.orderLine.qty - (line.orderLine.returned ?? 0))) throw new ApiError('tooManyReturned');
    if (!lines.length) throw new ApiError('notAllowed');
    const refund = order.paid ? lines.reduce((sum, line) => sum + (line.orderLine?.unitPrice ?? 0) * line.qty, 0) : 0;
    const saleReturn: SaleReturn | undefined = sale
      ? {
          id: newId(),
          number: nextNumber('R', 5),
          saleId: sale.id,
          branchId: sale.branchId,
          at,
          byId: me.id,
          kind: 'return',
          lines: lines.flatMap(({ orderLine, qty }) => {
            const saleLine = sale.lines.find((current) => current.variantId === orderLine?.variantId);
            return saleLine ? [{ saleLineId: saleLine.id, qty, amount: (orderLine?.unitPrice ?? 0) * qty, reasonId: input.reasonId, condition: 'available' as const }] : [];
          }),
          refunds: refund ? [{ methodId: order.methodId === 'pm-cod' ? 'pm-cash' : order.methodId, amount: refund }] : [],
        }
      : undefined;
    if (saleReturn) db.returns.push(saleReturn);
    lines.forEach(({ orderLine, qty }) => {
      if (!orderLine) return;
      orderLine.returned = (orderLine.returned ?? 0) + qty;
      db.movements.push({ id: newId(), at, byId: me.id, variantId: orderLine.variantId, qty, to: placeIn(branch, fulfilKinds[branch.kind], 'pendingInspection'), kind: 'return', ref: { type: 'onlineOrder', id: order.id } });
    });
    order.returns.push({ id: saleReturn?.id ?? newId(), at, byId: me.id, lines: lines.map(({ orderLine, qty }) => ({ variantId: orderLine?.variantId ?? '', qty })), reasonId: input.reasonId, refund });
    if (order.lines.every((line) => (line.returned ?? 0) >= line.qty)) order.status = 'returned';
  });

// ---- What the website shows ---------------------------------------------------------------------------------------

// The pieces the website can sell right now: available in the online stock, the Egyptian stores and the warehouse
// (orders ship from any of them). Reserved pieces are already taken out, so the website never oversells.
export type OnlineAvailability = 'inStock' | 'low' | 'soldOut' | 'reserved';
export type OnlineSource = 'online' | 'elsewhere';

export interface OnlineStockFilter {
  query?: string; // product name, SKU or barcode
  brandId?: Id;
  categoryId?: Id;
  size?: string;
  color?: string;
  availability?: OnlineAvailability; // low: at or under the low-stock limit in Policies
  source?: OnlineSource; // online: in the online stock; elsewhere: only in the stores or the warehouse
}

const onlineStockLimit = 200; // the most rows sent at once; the page says when there are more

export const getOnlineStock = (filter: OnlineStockFilter) =>
  respond(() => {
    assertOnlineStaff();
    const egypt = db.branches.filter((branch) => !branch.archived && branch.countryCode === 'EG');
    const online = egypt.find((branch) => branch.kind === 'online');
    const needle = filter.query?.trim().toLowerCase() ?? '';
    const variants = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, { product, variant }] as const)));
    const low = db.settings.lowStockDefault;
    const byVariant = new Map<Id, { online: number; elsewhere: number; reserved: number }>();
    stockLevels(db.movements).forEach((level) => {
      if (!egypt.some((branch) => branch.id === level.branchId) || level.qty <= 0) return;
      const row = byVariant.get(level.variantId) ?? { online: 0, elsewhere: 0, reserved: 0 };
      if (level.status === 'reserved') row.reserved += level.qty;
      if (level.status === 'available') {
        if (level.branchId === online?.id) row.online += level.qty;
        else row.elsewhere += level.qty;
      }
      byVariant.set(level.variantId, row);
    });
    const rows = [...byVariant.entries()]
      .map(([variantId, row]) => ({ variantId, ...row, shown: row.online + row.elsewhere, ...describeVariant(variantId), categoryId: variants.get(variantId)?.product.categoryId ?? '' }))
      .filter((row) => {
        const variant = variants.get(row.variantId)?.variant;
        if (!row.productId) return false;
        if (!matchesVariant(needle, { name: row.productName, sku: row.sku, barcode: variant?.barcode ?? '', size: row.size, color: row.color })) return false;
        if (filter.brandId && row.brandId !== filter.brandId) return false;
        if (filter.categoryId && row.categoryId !== filter.categoryId) return false;
        if (filter.size && row.size !== filter.size) return false;
        if (filter.color && row.color !== filter.color) return false;
        if (filter.availability === 'inStock' && row.shown <= 0) return false;
        if (filter.availability === 'low' && (row.shown <= 0 || row.shown > low)) return false;
        if (filter.availability === 'soldOut' && row.shown > 0) return false;
        if (filter.availability === 'reserved' && row.reserved <= 0) return false;
        if (filter.source === 'online' && row.online <= 0) return false;
        if (filter.source === 'elsewhere' && (row.online > 0 || row.elsewhere <= 0)) return false;
        return true;
      })
      .sort((a, b) => a.productName.localeCompare(b.productName) || a.size.localeCompare(b.size));
    return { rows: rows.slice(0, onlineStockLimit), total: rows.length };
  });
