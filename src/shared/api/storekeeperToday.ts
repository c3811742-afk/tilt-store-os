import type { Id } from '@/shared/types';
import { stockLevels } from '@/shared/utils';
import { assertBranch } from './branchScope';
import { lowStockRows } from './dashboard';
import { db, respond } from './server';

// What is waiting for a storekeeper today in their branch or warehouse.
export const getStorekeeperToday = (branchId: Id) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const floorIds = new Set(branch.locations.filter((location) => location.kind === 'floor').map((location) => location.id));
    const floorQty = new Map<Id, number>();
    const backQty = new Map<Id, number>();
    let inspection = 0;
    stockLevels(db.movements).forEach((level) => {
      if (level.branchId !== branchId) return;
      if (level.status === 'pendingInspection') inspection += level.qty;
      if (level.status !== 'available') return;
      const map = floorIds.has(level.locationId) ? floorQty : backQty;
      map.set(level.variantId, (map.get(level.variantId) ?? 0) + level.qty);
    });
    const lowOnFloor = floorIds.size ? [...backQty.entries()].filter(([variantId, back]) => back > 0 && (floorQty.get(variantId) ?? 0) <= 1).length : 0;
    return {
      toPrepare: db.transfers.filter((transfer) => transfer.fromBranchId === branchId && transfer.status === 'approved').length,
      toReceive: db.transfers.filter((transfer) => transfer.toBranchId === branchId && transfer.status === 'sent').length,
      inspection,
      drafts: db.receivings.filter((receiving) => receiving.branchId === branchId && receiving.status === 'draft').length,
      openCounts: db.counts.filter((count) => count.branchId === branchId && count.status === 'open').length,
      lowStock: lowStockRows().filter((row) => row.branchId === branchId).length,
      lowOnFloor,
    };
  });
