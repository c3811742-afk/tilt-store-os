import type { AlertKind, Id, StaffAlertKind } from '@/shared/types';
import { nowIso, stockLevels } from '@/shared/utils';
import { staffWithRole } from './branchScope';
import { minFor } from './branchStock';
import { describeVariant } from './stock';
import { db, newId, notify } from './server';

// Low-stock alerts after anything takes pieces out of a branch (a sale, a transfer, a defect, an online order).
// The owners get theirs (when switched on), and the branch's manager and storekeepers get theirs with a link to
// their own screens. An alert that is already waiting unread is not sent again.

// The shop floor counts as low at this many pieces (or fewer) while the back room still has some.
const floorLowAt = 1;

const alreadyWaiting = (userId: Id, kind: AlertKind | StaffAlertKind, link: string) =>
  db.notifications.some((item) => item.kind === kind && item.link === link && item.userIds.includes(userId) && !item.openedBy.includes(userId));

const send = (kind: AlertKind | StaffAlertKind, params: Record<string, string>, link: string, userIds: readonly Id[]) => {
  const fresh = userIds.filter((id) => !alreadyWaiting(id, kind, link));
  if (fresh.length) db.notifications.unshift({ id: newId(), at: nowIso(), kind, userIds: fresh, openedBy: [], params, link });
};

export const checkStockAlerts = (branchId: Id, variantIds: readonly Id[]) => {
  const branch = db.branches.find((current) => current.id === branchId);
  if (!branch || branch.kind !== 'store') return;
  const floorIds = new Set(branch.locations.filter((location) => location.kind === 'floor').map((location) => location.id));
  [...new Set(variantIds)].forEach((variantId) => {
    const levels = stockLevels(db.movements.filter((movement) => movement.variantId === variantId)).filter((level) => level.branchId === branchId && level.status === 'available');
    const available = levels.reduce((sum, level) => sum + level.qty, 0);
    const floor = levels.filter((level) => floorIds.has(level.locationId)).reduce((sum, level) => sum + level.qty, 0);
    const back = available - floor;
    const min = minFor(variantId, branchId);
    const info = describeVariant(variantId);
    const product = `${info.productName} ${info.size} ${info.color}`.trim();
    if (available <= min) {
      const params = { product, branch: branch.name, qty: String(available), min: String(min) };
      const ownerLink = `/owner/stock/item/${variantId}`;
      if (!db.notifications.some((item) => item.kind === 'lowStock' && item.link === ownerLink && !item.openedBy.length)) notify('lowStock', params, ownerLink);
      send('lowStock', params, `/manager/stock/item/${variantId}`, staffWithRole('manager', branchId));
      send('lowStock', params, `/storekeeper/stock/item/${variantId}`, staffWithRole('storekeeper', branchId));
    } else if (floorIds.size && floor <= floorLowAt && back > 0) {
      send('lowOnFloor', { product, floor: String(floor), back: String(back) }, `/storekeeper/stock/item/${variantId}`, staffWithRole('storekeeper', branchId));
    }
  });
};

// For the cashier's return screen: a customer brought back a defective piece. The pieces wait for inspection and
// the branch's storekeepers (and the owners, when switched on) are told.
export const alertDefectiveReturn = (branchId: Id, variantId: Id) => {
  const branch = db.branches.find((current) => current.id === branchId);
  if (!branch) return;
  const params = { branch: branch.name, product: describeVariant(variantId).productName };
  notify('defectiveReturn', params, '/owner/defects');
  send('defectiveReturn', params, '/storekeeper/defects', staffWithRole('storekeeper', branchId));
};
