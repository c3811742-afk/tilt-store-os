import type { Id, IsoDateTime } from './common';

export type ApprovalKind =
  | 'discount'
  | 'refund'
  | 'priceOverride'
  | 'returnOutsidePolicy'
  | 'returnWithoutReceipt'
  | 'void'
  | 'stockCount'
  | 'writeOff'
  | 'costRedistribution'
  | 'promotion'
  | 'stockRequest'
  | 'payout'
  | 'transfer'; // a transfer out of a branch, approved by that branch's manager

export type ApprovalLevel = 'manager' | 'owner';

// Anything waiting for a yes or no. Deciding it applies the change it is about.
export interface ApprovalRequest {
  id: Id;
  kind: ApprovalKind;
  level: ApprovalLevel;
  branchId?: Id;
  requestedById: Id;
  at: IsoDateTime;
  amount?: number;
  currency?: string;
  percent?: number;
  ref?: { type: string; id: Id };
  summary: string; // what is asked, e.g. "25% off Ramla linen shirt"
  status: 'pending' | 'approved' | 'rejected';
  decidedById?: Id;
  decidedAt?: IsoDateTime;
  channel?: 'till' | 'phone' | 'app';
  reason?: string;
  note?: string; // added by whoever decided
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'priceChange'
  | 'costChange'
  | 'discount'
  | 'refund'
  | 'void'
  | 'writeOff'
  | 'stockAdjust'
  | 'cashDifference'
  | 'pay'
  | 'lock'
  | 'signIn'
  | 'export'
  | 'send'
  | 'signOut'
  | 'backup';

export type ActivityTarget =
  | 'brand'
  | 'product'
  | 'category'
  | 'branch'
  | 'rate'
  | 'vat'
  | 'tax'
  | 'device'
  | 'user'
  | 'role'
  | 'promotion'
  | 'promoCode'
  | 'batch'
  | 'defect'
  | 'writeOff'
  | 'stock'
  | 'transfer'
  | 'stockRequest'
  | 'stockCount'
  | 'statement'
  | 'payment'
  | 'fee'
  | 'expense'
  | 'approval'
  | 'settings'
  | 'sale'
  | 'return'
  | 'shift'
  | 'eReceipt'
  | 'customer'
  | 'reservation'
  | 'heldSale'
  | 'record'
  | 'backup';

export interface ActivityChange {
  field: string;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
}

export interface ActivityEntry {
  id: Id;
  at: IsoDateTime;
  userId: Id;
  branchId?: Id;
  action: ActivityAction;
  target: { type: ActivityTarget; id: Id; label: string };
  changes?: ActivityChange[];
  amount?: number;
  currency?: string;
  flagged: boolean; // matches one of the owner's flag rules
}

export type AlertKind =
  | 'lowStock'
  | 'batchCostChanged'
  | 'belowMargin'
  | 'largeDiscountOrRefund'
  | 'cashDifference'
  | 'brandPaymentDue'
  | 'transferMissing'
  | 'noSellingPrice'
  | 'stockRequest'
  | 'pickupMismatch'
  | 'defectiveReturn'
  | 'eReceiptFailed'
  | 'approvalWaiting'
  | 'approvalApproved'
  | 'approvalRejected'
  | 'promotionApproved'
  | 'promotionRejected';

// Alerts only branch staff receive (the owners' own alerts, which they can switch off, are AlertKind).
export type StaffAlertKind = 'transferArrived' | 'stockRequestDecided' | 'transferAssigned' | 'transferReady' | 'lowOnFloor' | 'countSubmitted' | 'transferDecided';

export interface AppNotification {
  id: Id;
  at: IsoDateTime;
  kind: AlertKind | StaffAlertKind;
  userIds: Id[]; // who receives it
  openedBy: Id[];
  params: Record<string, string>; // filled into the alert's text
  link: string; // the page it is about
}
