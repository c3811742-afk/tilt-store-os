import type { BrandModel } from './catalog';
import type { CurrencyCode, Id, IsoDateTime } from './common';
import type { TaxAuthority } from './org';

export type SalesChannel = 'store' | 'online';

export interface SaleLine {
  id: Id;
  productId: Id;
  variantId: Id;
  brandId: Id;
  categoryId: Id;
  qty: number;
  unitPrice: number; // the list price, in the sale's currency, VAT included
  discount: number; // the total discount on the line (its own plus its share of an order discount)
  discountReasonId?: Id;
  discountById?: Id;
  promotionId?: Id;
  promoCodeId?: Id;
  brandSharePercent: number; // of the discount, paid by the brand
  commissionOnOriginal: boolean; // commission on the price before the discount
  // Snapshots, so later changes never rewrite past profit:
  unitCost: number; // base currency
  commissionRate: number;
  model: BrandModel;
}

export interface Payment {
  methodId: Id;
  amount: number;
  reference?: string;
  feePercent: number; // the card or wallet fee at the time of the sale
}

export type EReceiptStatus = 'sent' | 'failed' | 'pending' | 'notRequired';

export interface EReceipt {
  authority: TaxAuthority;
  status: EReceiptStatus;
  deviceId?: Id;
  error?: 'deviceNotRegistered' | 'invalidVatNumber' | 'timeout' | 'rejected';
  attempts: number;
  lastAttemptAt?: IsoDateTime;
}

export interface Sale {
  id: Id;
  number: string;
  branchId: Id;
  channel: SalesChannel;
  at: IsoDateTime;
  cashierId: Id;
  customerId?: Id;
  currency: CurrencyCode;
  rate: number; // the currency's rate to the base currency on the sale's day
  vatRate: number; // percent, on the sale's day
  lines: SaleLine[];
  payments: Payment[];
  eReceipt: EReceipt;
  voidedAt?: IsoDateTime; // a voided sale is reversed with a record, never edited
  voidedById?: Id;
  voidReasonId?: Id; // an approval reason from the owner's list
  voidNote?: string;
}

export type ReturnCondition = 'available' | 'defective' | 'toReturn';

export interface ReturnLine {
  saleLineId: Id;
  qty: number;
  amount: number; // refunded, in the sale's currency
  reasonId: Id;
  condition: ReturnCondition;
}

export interface SaleReturn {
  id: Id;
  number: string;
  saleId: Id;
  branchId: Id;
  at: IsoDateTime;
  byId: Id;
  kind: 'return' | 'exchange';
  lines: ReturnLine[];
  refunds: { methodId: Id; amount: number }[];
  exchangeSaleId?: Id;
}

export interface Customer {
  id: Id;
  name: string;
  phone: string;
  createdAt: IsoDateTime;
}

export interface Shift {
  id: Id;
  branchId: Id;
  register: string;
  cashierId: Id;
  openedAt: IsoDateTime;
  closedAt?: IsoDateTime;
  currency: CurrencyCode;
  openingCash: number;
  expectedCash?: number;
  countedCash?: number;
  note?: string;
  approvedById?: Id;
  closedById?: Id; // a manager can close a register for a cashier
  approvedAt?: IsoDateTime;
  approvalReason?: Id; // an approval reason from the owner's list
}

// A cash check: someone counted the cash in a register at any time and compared it with what the system expects.
export interface CashCheck {
  id: Id;
  branchId: Id;
  shiftId: Id;
  at: IsoDateTime;
  byId: Id;
  currency: CurrencyCode;
  expected: number;
  counted: number;
  note?: string;
}

export type OnlineOrderStatus = 'new' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface OnlineOrderLine {
  variantId: Id;
  qty: number;
  unitPrice: number; // in the order's currency, VAT included
  returned?: number;
}

// An order from the online store. Its pieces are reserved where it ships from as soon as it is placed; shipping
// records the sale; cancelling puts the pieces back in stock.
export interface OnlineOrder {
  id: Id;
  number: string;
  at: IsoDateTime;
  customer: { name: string; phone: string; address: string; city: string };
  lines: OnlineOrderLine[];
  currency: CurrencyCode;
  methodId: Id; // card, wallet, InstaPay or cash on delivery
  paid: boolean;
  paidAt?: IsoDateTime;
  paidById?: Id; // cash on delivery: who marked it paid
  status: OnlineOrderStatus;
  fulfilBranchId: Id; // the branch, warehouse or online stock it ships from
  packedAt?: IsoDateTime;
  packedById?: Id;
  shippedAt?: IsoDateTime;
  shippedById?: Id;
  trackingNumber?: string;
  deliveredAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  cancelledById?: Id;
  cancelReasonId?: Id;
  saleId?: Id; // the sale recorded when it shipped
  returns: { id: Id; at: IsoDateTime; byId: Id; lines: { variantId: Id; qty: number }[]; reasonId: Id; refund: number }[];
}
