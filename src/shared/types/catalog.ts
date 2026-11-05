import type { CurrencyCode, Id, IsoDate, IsoDateTime, Localized, PriceList, StoredFile } from './common';

// own: the store's own brand. commission: the brand owns the stock, the store takes a cut. bought: the store bought the stock.
export type BrandModel = 'own' | 'commission' | 'bought';
export type DiscountFunding = 'shared' | 'store' | 'brand';
export type DefectPolicy = 'brandReplaces' | 'storeAbsorbs';
export type PayoutFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type BrandStatus = 'active' | 'paused';
export type PaymentDetailsMethod = 'bank' | 'instapay';

export interface BrandTerms {
  model: BrandModel;
  commissionRate: number; // percent of each sale the store keeps (commission brands)
  monthlyFee: number; // shelf rent, 0 for none
  feeCurrency: CurrencyCode;
  deductFeeFromPayout: boolean; // take the fee out of the payout instead of collecting it
  payoutFrequency: PayoutFrequency;
  payoutCurrency: CurrencyCode;
  allowDiscounts: boolean; // can the store put this brand's items on sale
  discountFunding: DiscountFunding; // who pays for discounts by default
  brandSharePercent: number; // the brand's share when funding is shared
  defectPolicy: DefectPolicy;
  minMargin: number | null; // percent; null uses the category's or the store's default
}

// Terms apply from `effectiveFrom`; past sales keep the terms of their date.
export interface TermsVersion {
  id: Id;
  effectiveFrom: IsoDate;
  terms: BrandTerms;
  byId: Id;
  at: IsoDateTime;
  note?: string;
}

export interface Brand {
  id: Id;
  name: string;
  logo?: string;
  instagram?: string;
  contactName: string;
  phone: string;
  email: string;
  payment: { method: PaymentDetailsMethod; bankName: string; accountName: string; accountNumber: string; instapay: string };
  contractStart: IsoDate;
  status: BrandStatus;
  termsHistory: TermsVersion[]; // oldest first
  agreement?: StoredFile & { uploadedAt: IsoDateTime; byId: Id };
  createdAt: IsoDateTime;
}

export interface Category {
  id: Id;
  name: Localized;
  archived: boolean;
  minMargin: number | null; // percent
}

export interface Variant {
  id: Id;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  barcodeGenerated: boolean; // made by the system for an item that came without one
  prices: PriceList; // overrides the product's price in a currency (e.g. XXL costs more)
  archived: boolean;
}

export interface Product {
  id: Id;
  brandId: Id;
  categoryId: Id;
  name: string;
  photo?: string;
  season: string;
  collection: string;
  prices: PriceList; // the selling price per currency, entered directly (never converted)
  pricesSavedAt?: Record<CurrencyCode, IsoDateTime>; // when each currency's price was last saved
  cost: number; // the unit cost in the base currency, before any batch adjustment
  variants: Variant[];
  archived: boolean;
  createdAt: IsoDateTime;
}

export type PriceChangeKind = 'price' | 'cost';

export interface PriceChange {
  id: Id;
  productId: Id;
  variantId?: Id;
  kind: PriceChangeKind;
  currency: CurrencyCode;
  from: number | null;
  to: number | null;
  at: IsoDateTime;
  byId: Id;
  scheduleId?: Id; // made by a scheduled change
}

export type ScheduleKind = 'change' | 'sale';

// A price change or a sale price that starts (and for a sale, ends) on set dates.
export interface PriceSchedule {
  id: Id;
  productId: Id;
  variantId?: Id;
  kind: ScheduleKind;
  currency: CurrencyCode;
  price: number;
  startDate: IsoDate;
  endDate?: IsoDate;
  cancelled: boolean;
  byId: Id;
  at: IsoDateTime;
}
