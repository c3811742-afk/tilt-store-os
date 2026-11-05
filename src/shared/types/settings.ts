import type { CountryCode, CurrencyCode, Id, Localized, ConfigOption, StoredFile } from './common';
import type { BrandTerms } from './catalog';
import type { AlertKind } from './activity';
import type { TaxAuthority, TaxRegistration } from './org';

export type ReceiptLanguage = 'en' | 'ar' | 'both';
export type PaymentKind = 'cash' | 'card' | 'wallet' | 'instapay' | 'storeCredit' | 'cod' | 'other';
export type RefundMethod = 'cash' | 'cardReversal' | 'storeCredit';
export type SaleItemReturnRule = 'refundOrExchange' | 'exchangeOnly';

export interface PaymentMethod {
  id: Id;
  name: Localized;
  kind: PaymentKind;
  feePercent: number; // what the bank or wallet charges per payment
  active: boolean;
}

export interface CountrySettings {
  countryCode: CountryCode;
  authority: TaxAuthority; // the e-receipt system sales are sent to
  registration: TaxRegistration;
  receipt: { header: Localized; footer: Localized; returnPolicy: Localized; showLogo: boolean };
  returns: {
    days: number;
    receiptRequired: boolean;
    saleItems: SaleItemReturnRule;
    refundMethods: RefundMethod[];
    otherBranch: boolean; // can be returned at another branch in this country
  };
}

export interface FlagRules {
  discountAbovePercent: number;
  refundAbove: number; // in the base currency
  priceChanges: boolean;
  costChanges: boolean;
  writeOffs: boolean;
  cashDifferences: boolean;
  stockAdjustments: boolean;
  voids: boolean;
}

export interface Settings {
  company: { name: string; logo?: StoredFile };
  baseCurrency: CurrencyCode; // exchange rates are against this one
  reportingCurrency: CurrencyCode; // used when branches are combined
  receiptLanguage: ReceiptLanguage;
  countries: CountrySettings[];
  crossCountryExchange: boolean;
  nonReturnable: { productIds: Id[]; categoryIds: Id[] };
  paymentMethods: PaymentMethod[];
  discountLimits: { cashier: number; manager: number }; // percent
  approvalRules: { discountAboveLimit: boolean; returnOutsidePolicy: boolean; returnWithoutReceipt: boolean; void: boolean; priceOverride: boolean };
  refundApprovalAbove: number; // in the base currency: a manager approves refunds above this
  ownerApprovalAbove: number; // in the base currency: an owner approves discounts and refunds above this
  stockCountApprovalAbove: number; // pieces: an owner approves count adjustments above this
  approvalPinTries: number;
  manualDiscountOnPromotion: boolean;
  staffDiscount: { percent: number; monthlyLimit: number };
  defaultMinMargin: number; // percent
  defaultBrandTerms: BrandTerms;
  lowStockDefault: number; // pieces, when an item has no minimum of its own
  slowMoverWeeks: number;
  agingBuckets: number[]; // days
  feeDueDay: number; // day of the month a monthly fee is due
  flagRules: FlagRules;
  ownerAlerts: Record<AlertKind, boolean>;
  sizes: string[];
  colors: string[];
  seasons: string[];
  barcodePrefix: string;
  lists: {
    discountReasons: ConfigOption[];
    returnReasons: ConfigOption[];
    defectReasons: ConfigOption[];
    writeOffReasons: ConfigOption[];
    countReasons: ConfigOption[];
    expenseCategories: ConfigOption[];
    approvalReasons: ConfigOption[];
  };
}

export type ConfigListKey = keyof Settings['lists'];
export type { CurrencyCode };
