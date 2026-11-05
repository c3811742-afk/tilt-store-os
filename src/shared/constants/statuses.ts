import type {
  ApprovalKind,
  BrandModel,
  BrandPaymentMethod,
  BranchKind,
  DefectPolicy,
  DefectStatus,
  DiscountFunding,
  PayoutFrequency,
  PromotionState,
  StockRequestStatus,
  StockStatus,
  TransferStatus,
  UserStatus,
} from '@/shared/types';
import type { BadgeVariant } from '@/shared/components/Badge/Badge.types';

// The fixed choices the system offers. Their labels are in the text files under the same keys.
export const stockStatuses: readonly StockStatus[] = [
  'available',
  'reserved',
  'inTransit',
  'pendingInspection',
  'defective',
  'repairable',
  'toReturn',
  'returned',
  'writtenOff',
];
// Pieces in these statuses are still in the building (they count in stock totals and value).
export const onHandStatuses: readonly StockStatus[] = ['available', 'reserved', 'pendingInspection', 'defective', 'repairable', 'toReturn'];
export const brandModels: readonly BrandModel[] = ['own', 'commission', 'bought'];
export const discountFundings: readonly DiscountFunding[] = ['shared', 'store', 'brand'];
export const defectPolicies: readonly DefectPolicy[] = ['brandReplaces', 'storeAbsorbs'];
export const payoutFrequencies: readonly PayoutFrequency[] = ['weekly', 'biweekly', 'monthly', 'quarterly'];
export const branchKinds: readonly BranchKind[] = ['store', 'online', 'warehouse'];
export const brandPaymentMethods: readonly BrandPaymentMethod[] = ['bank', 'instapay', 'cash'];

export const stockStatusTone: Record<StockStatus, BadgeVariant> = {
  available: 'success',
  reserved: 'info',
  inTransit: 'info',
  pendingInspection: 'warning',
  defective: 'danger',
  repairable: 'warning',
  toReturn: 'warning',
  returned: 'neutral',
  writtenOff: 'neutral',
};
export const transferStatusTone: Record<TransferStatus, BadgeVariant> = {
  requested: 'info',
  approved: 'info',
  rejected: 'neutral',
  sent: 'warning',
  received: 'success',
  cancelled: 'neutral',
};
export const requestStatusTone: Record<StockRequestStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'neutral',
  sentToWarehouse: 'success',
  sentToBrand: 'success',
};
export const promotionStateTone: Record<PromotionState, BadgeVariant> = {
  requested: 'warning',
  scheduled: 'info',
  active: 'success',
  ended: 'neutral',
  rejected: 'neutral',
};
export const defectStatusTone: Record<DefectStatus, BadgeVariant> = {
  open: 'warning',
  returnedToBrand: 'info',
  credited: 'success',
  writtenOff: 'neutral',
  repaired: 'success',
};
export const userStatusTone: Record<UserStatus, BadgeVariant> = { active: 'success', invited: 'info', inactive: 'neutral' };
export const approvalStateTone = { pending: 'warning', approved: 'success', rejected: 'neutral' } as const satisfies Record<string, BadgeVariant>;
export const feeStateTone = { due: 'warning', paid: 'success', overdue: 'danger', upcoming: 'neutral' } as const satisfies Record<string, BadgeVariant>;
export const eReceiptTone = { sent: 'success', failed: 'danger', pending: 'warning', notRequired: 'neutral' } as const satisfies Record<string, BadgeVariant>;

// Requests an owner decides, in the order they are listed.
export const ownerApprovalKinds: readonly ApprovalKind[] = [
  'discount',
  'refund',
  'priceOverride',
  'stockCount',
  'writeOff',
  'costRedistribution',
  'promotion',
  'stockRequest',
  'payout',
];
