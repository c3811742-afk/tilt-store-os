import type { CurrencyCode, Id, IsoDateTime, StoredFile } from './common';

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
  ref?: { type: 'sale' | 'return' | 'transfer' | 'receiving' | 'count' | 'writeOff' | 'brandReturn' | 'defect' | 'onlineOrder'; id: Id };
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
  photos?: StoredFile[]; // pictures of the defect
  markedToReturnById?: Id; // a manager or storekeeper set it aside to go back to the brand
  markedToReturnAt?: IsoDateTime;
  locationId?: Id; // where the defective pieces are kept
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
  extra?: number; // pieces that arrived but were not on the transfer
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
  note?: string; // from whoever asked for it
  decidedById?: Id; // the sending branch's manager, who approved or rejected it
  decidedAt?: IsoDateTime;
  decisionReason?: string; // an approval reason id from the owner's list
  decisionNote?: string;
  cancelledById?: Id;
  cancelledAt?: IsoDateTime;
  handedOverById?: Id; // the storekeeper who gave the stock to the driver
  deliveredAt?: IsoDateTime;
  deliveredToId?: Id; // the storekeeper who took the stock from the driver
  receivedById?: Id;
  differenceClosedById?: Id; // the manager who reviewed a driver's pickup / delivery difference
  differenceClosedAt?: IsoDateTime;
  stockStatus?: 'defective'; // damaged pieces sent to the warehouse travel as defective (default: available pieces)
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
  status?: 'draft' | 'confirmed'; // a draft is still being counted; confirming adds the stock
  consignment?: boolean; // the brand still owns the pieces until they sell
  batchNumber?: string; // the brand's delivery or batch reference
  note?: string;
  confirmedAt?: IsoDateTime;
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
}

export interface StockCount {
  id: Id;
  number: string;
  branchId: Id;
  at: IsoDateTime;
  byId: Id;
  blind: boolean;
  lines: { variantId: Id; expected: number; counted: number; reasonId?: Id; locationId?: Id }[];
  status: ApprovalState | 'open'; // open: still being counted
  decidedById?: Id;
  decidedAt?: IsoDateTime;
  scope?: { kind: 'full' | 'brand' | 'location'; brandId?: Id; locationId?: Id }; // what is being counted
  submittedById?: Id; // who sent it for approval
  submittedAt?: IsoDateTime;
  decisionReason?: string; // an approval reason id from the owner's list
}

// Pieces sent back to a brand: unsold stock, or defective pieces it replaces or credits. Stock goes down when sent.
export interface BrandReturn {
  id: Id;
  number: string;
  brandId: Id;
  branchId: Id;
  at: IsoDateTime;
  byId: Id;
  lines: { variantId: Id; qty: number; condition: 'unsold' | 'defective'; defectId?: Id }[];
  note?: string;
  status: 'sent' | 'settled';
  settlement?: { kind: 'replacement' | 'credit'; amount?: number; currency?: CurrencyCode; qty?: number; at: IsoDateTime; byId: Id; note?: string };
}
