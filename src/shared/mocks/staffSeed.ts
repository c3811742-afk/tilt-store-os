import type { Database } from '@/shared/api/database';
import { placeOrderIn, randomOrderInput, shipOrderIn } from '@/shared/api/onlineOrders';
import type { Id, IsoDate, OnlineOrder } from '@/shared/types';

// Demo data for the branch staff screens (branch manager, storekeeper, driver, online orders): requests waiting at
// the till, registers open today and online orders. Added at the end of the seed, after the sales history exists.
// Names, amounts and times are made up for the demo.

// A time on `day`; minutes past 59 roll over into the next hour (e.g. a fourth till opening at 10:60 is 11:00).
// A time still ahead (the demo opened early in the morning) moves back a day, so nothing has happened in the future.
const at = (day: IsoDate, hour: number, minute = 0) => {
  const time = new Date(`${day}T00:00:00`);
  time.setMinutes(hour * 60 + minute);
  if (time.getTime() > Date.now()) time.setDate(time.getDate() - 1);
  return time.toISOString();
};

export const addStaffDemoData = (data: Database, newId: () => string, today: IsoDate) => {
  const userWith = (roleId: string, branchId: Id) => data.users.filter((user) => user.status === 'active' && user.roleIds.includes(roleId) && user.branchIds.includes(branchId));
  const stores = data.branches.filter((branch) => branch.kind === 'store' && !branch.archived);

  // ---- Requests from the till, waiting for each store's manager ----
  stores.forEach((branch) => {
    const cashier = userWith('role-cashier', branch.id)[0];
    const manager = userWith('role-manager', branch.id)[0];
    if (!cashier || !manager) return;
    const money = (egp: number) => (branch.currency === 'SAR' ? Math.round(egp / 13) : egp);
    const request = (fields: Omit<Database['approvals'][number], 'id' | 'status' | 'level' | 'branchId' | 'currency'>) => {
      data.approvals.push({ id: newId(), status: 'pending', level: 'manager', branchId: branch.id, currency: branch.currency, ...fields });
      // The branch manager is told something is waiting (the till does this when a cashier asks).
      const requester = data.users.find((user) => user.id === fields.requestedById);
      if (fields.requestedById !== manager.id) data.notifications.unshift({ id: newId(), at: fields.at, kind: 'approvalWaiting', userIds: [manager.id], openedBy: [], params: { summary: fields.summary, user: requester?.name ?? '' }, link: '/manager/approvals' });
    };
    request({ kind: 'discount', requestedById: cashier.id, at: at(today, 12, 20), percent: 15, amount: money(220), summary: '15% off a hoodie with a loose thread', channel: 'phone' });
    request({ kind: 'refund', requestedById: cashier.id, at: at(today, 13, 5), amount: money(4600), summary: 'Refund of 3 pieces, wrong sizes', channel: 'phone' });
    request({ kind: 'priceOverride', requestedById: cashier.id, at: at(today, 14, 40), amount: money(950), summary: 'Shelf price lower than the system price', channel: 'till' });
    request({ kind: 'returnOutsidePolicy', requestedById: cashier.id, at: at(today, 15, 10), amount: money(1450), summary: 'Return on day 16, tags still on', channel: 'till' });
    request({ kind: 'returnWithoutReceipt', requestedById: cashier.id, at: at(today, 16, 0), amount: money(650), summary: 'Return without a receipt, paid by card', channel: 'till' });
    // The manager's own discount: another manager or the owner has to approve it.
    request({ kind: 'discount', requestedById: manager.id, at: at(today, 11, 30), percent: 10, amount: money(180), summary: '10% off for a regular customer', channel: 'app' });
  });

  // ---- Registers open today, one per cashier, and a morning register closed with a difference to explain ----
  stores.forEach((branch) => {
    const float = branch.currency === 'SAR' ? 500 : 2000;
    const cashiers = userWith('role-cashier', branch.id);
    cashiers.forEach((cashier, index) => {
      data.shifts.push({ id: newId(), branchId: branch.id, register: `Till ${index + 1}`, cashierId: cashier.id, openedAt: at(today, 10, 30 + index * 10), currency: branch.currency, openingCash: float });
    });
    const first = cashiers[0];
    if (!first) return;
    const short = branch.currency === 'SAR' ? -5 : -50;
    data.shifts.push({ id: newId(), branchId: branch.id, register: 'Till 3', cashierId: first.id, openedAt: at(today, 8, 0), closedAt: at(today, 10, 15), currency: branch.currency, openingCash: float, expectedCash: float, countedCash: float + short });
  });

  // ---- Pieces customers returned today, waiting for the storekeeper to check them ----
  stores.forEach((branch) => {
    const storekeepers = userWith('role-storekeeper', branch.id).map((user) => user.id);
    const cashier = userWith('role-cashier', branch.id)[0];
    const recent = data.returns.filter((saleReturn) => saleReturn.branchId === branch.id).slice(-2);
    const backRoom = branch.locations.find((location) => location.kind === 'backRoom') ?? branch.locations[0];
    recent.forEach((saleReturn, index) => {
      const sale = data.sales.find((current) => current.id === saleReturn.saleId);
      const line = sale?.lines.find((current) => current.id === saleReturn.lines[0]?.saleLineId);
      if (!line || !cashier) return;
      const when = at(today, 11 + index * 2, 15);
      data.movements.push({ id: newId(), at: when, byId: cashier.id, variantId: line.variantId, qty: 1, to: { branchId: branch.id, locationId: backRoom.id, status: 'pendingInspection' }, kind: 'return', ref: { type: 'return', id: saleReturn.id } });
      const product = data.products.find((current) => current.id === line.productId);
      if (storekeepers.length) data.notifications.unshift({ id: newId(), at: when, kind: 'defectiveReturn', userIds: storekeepers, openedBy: [], params: { branch: branch.name, product: product?.name ?? '' }, link: '/storekeeper/defects' });
    });
  });

  // ---- Online orders placed today, at different steps ----
  const website = data.users.find((user) => user.roleIds.includes('role-online'));
  if (website) {
    const steps: OnlineOrder['status'][] = ['delivered', 'shipped', 'packed', 'new', 'new', 'new'];
    steps.forEach((status, index) => {
      const placedAt = at(today, 9 + index, 10 + index * 5);
      const input = randomOrderInput(data, 7000 + index, placedAt, website.id);
      if (!input) return;
      const order = placeOrderIn(data, { ...input, methodId: index === 1 ? 'pm-cod' : input.methodId });
      if (status === 'new') return;
      Object.assign(order, { status: 'packed', packedAt: at(today, 10 + index, 0), packedById: website.id });
      if (status === 'packed') return;
      shipOrderIn(data, order, website.id, at(today, 11 + index, 0), `EG${String(483200 + index)}`);
      if (status === 'delivered') Object.assign(order, { status: 'delivered', deliveredAt: at(today, 15, 30) });
    });
  }
};
