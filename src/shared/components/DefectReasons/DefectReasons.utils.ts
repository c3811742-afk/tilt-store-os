import type { DefectReasonQty } from '@/shared/types';

// One row (or none) means all the pieces share that reason, so its quantity always follows the total. Split rows
// never add up to more than the total: if the total goes down, the last rows lose pieces first.
export const splitDefectReasons = (value: readonly DefectReasonQty[], total: number): DefectReasonQty[] => {
  if (value.length <= 1) return [{ reasonId: value[0]?.reasonId ?? '', qty: total }];
  let left = total;
  return value.map((row) => {
    const qty = Math.min(row.qty, left);
    left -= qty;
    return { ...row, qty };
  });
};

// Every piece has a reason: each row has one, and the quantities add up to the total.
export const defectReasonsComplete = (value: readonly DefectReasonQty[], total: number) => {
  const rows = splitDefectReasons(value, total);
  return rows.every((row) => row.reasonId && row.qty > 0) && rows.reduce((sum, row) => sum + row.qty, 0) === total;
};
