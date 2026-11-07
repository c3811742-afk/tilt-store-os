import type { CurrencyCode, Id, IsoDateTime } from './common';

export type StockStatus =
  | 'available'
  | 'reserved'
  | 'inTransit'
  | 'pendingInspection'
  | 'defective'
  | 'repairable'
  | 'toReturn'
  | 'returned'
  | 'writtenOff';

export interface StockPlace {
  branchId: Id;
  locationId: Id;
  status: StockStatus;
}

export type MovementKind =
  | 'receive'
  | 'sale'
  | 'return'
  | 'transferOut'
  | 'transferIn'
  | 'adjust'
  | 'statusChange'
  | 'move'
  | 'writeOff'
  | 'returnToBrand';

// Every change to stock is a movement: `qty` pieces leave `from` and arrive in `to`.
// Stock levels are always the sum of the movements, so they can't be changed directly.
export interface StockMovement {
  id: Id;
  at: IsoDateTime;
  byId: Id;
  variantId: Id;
  qty: number;
  from?: StockPlace;
  to?: StockPlace;
  kind: MovementKind;
  ref?: { type: 'sale' | 'return' | 'transfer' | 'receiving' | 'count' | 'writeOff' | 'brandReturn' | 'reservation' | 'defect'; id: Id };
  reason?: string;
  batchId?: Id;
}

export type DefectHandling = 'redistribute' | 'writeOff';
export type ApprovalState = 'pending' | 'approved' | 'rejected';

// One delivery of one product: its total cost spreads over the pieces that can be sold.
export interface Batch {
  id: Id;
  number: string;
  productId: Id;
  brandId: Id;
  branchId: Id;
  receivedAt: IsoDateTime;
  qty: number;
  totalCost: number; // in `currency`
  currency: CurrencyCode;
  defects: number;
  defectHandling: DefectHandling;
  redistribution: ApprovalState | 'none'; // the owner approves before the new cost applies
  brandCredit: number; // money or replacements from the brand for defects, lowers the cost again
  sellingPrice?: number; // own brands: a changed price for this batch because of defects
}

export type DefectLiability = 'brand' | 'store';
export type DefectFoundAt = 'receiving' | 'storage' | 'customerReturn' | 'store';
export type DefectStatus = 'open' | 'returnedToBrand' | 'credited' | 'writtenOff' | 'repaired';

export interface Defect {
  id: Id;
  at: IsoDateTime;
  byId: Id;
  productId: Id;
  variantId: Id;
  batchId?: Id;
  branchId: Id;
  qty: number;
  reasonId: Id;
  foundAt: DefectFoundAt;
  liability: DefectLiability;
  status: DefectStatus;
  unitCost: number; // base currency, at the time it was found
  note?: string;
}

export interface WriteOff {
  id: Id;
  at: IsoDateTime;
  byId: Id;
  variantId: Id;
  branchId: Id;
  qty: number;
  kind: 'defective' | 'lost';
  reasonId: Id;
  unitCost: number;
  status: ApprovalState;
  decidedById?: Id;
  decidedAt?: IsoDateTime;
}

export interface SignedLine {
  variantId: Id;
  qty: number;
  defects?: number;
  missing?: number;
}

// An electronic signature on a handover: who signed, when, and the quantity of each product.
export interface Signature {
  name: string;
  userId?: Id;
  signedAt: IsoDateTime;
  lines: SignedLine[];
}

export type TransferStatus = 'requested' | 'approved' | 'rejected' | 'sent' | 'received' | 'cancelled';

export interface TransferLine {
  variantId: Id;
  qty: number;
  received?: number;
  defects?: number;
}

export interface Transfer {
  id: Id;
  number: string;
  fromBranchId: Id;
  toBranchId: Id;
  lines: TransferLine[];
  status: TransferStatus;
  driverId?: Id;
  requestedById: Id;
  createdAt: IsoDateTime;
  sentAt?: IsoDateTime;
  receivedAt?: IsoDateTime;
  pickup?: Signature; // the driver signs when taking the stock
  delivery?: Signature; // the driver signs when handing it over
  receipt?: Signature; // the storekeeper countersigns with what arrived
  differenceNote?: string;
}

export interface Receiving {
  id: Id;
  number: string;
  brandId: Id;
  branchId: Id;
  at: IsoDateTime;
  byId: Id;
  batchIds: Id[];
  lines: { variantId: Id; expected: number; received: number; defective: number; missing: number }[];
  courier?: Signature;
  storekeeper?: Signature;
}

export type StockRequestStatus = 'pending' | 'approved' | 'rejected' | 'sentToWarehouse' | 'sentToBrand';

export interface StockRequest {
  id: Id;
  number: string;
  branchId: Id;
  requestedById: Id;
  at: IsoDateTime;
  lines: { variantId: Id; qty: number }[];
  status: StockRequestStatus;
  decidedById?: Id;
  decidedAt?: IsoDateTime;
  note?: string;
  fromBranchId?: Id; // asked from another branch (a cashier for a customer); otherwise from the warehouse
  customer?: { name: string; phone: string };
}

export interface StockCount {
  id: Id;
  number: string;
  branchId: Id;
  at: IsoDateTime;
  byId: Id;
  blind: boolean;
  lines: { variantId: Id; expected: number; counted: number; reasonId?: Id }[];
  status: ApprovalState;
  decidedById?: Id;
  decidedAt?: IsoDateTime;
}
