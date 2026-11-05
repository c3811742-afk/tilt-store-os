import type { CurrencyCode, Id, IsoDate, IsoDateTime } from './common';

export type PromotionTargetKind = 'variants' | 'products' | 'brand' | 'category';
export type DiscountType = 'percent' | 'amount';
export type PromotionState = 'requested' | 'scheduled' | 'active' | 'ended' | 'rejected';

export interface Promotion {
  id: Id;
  name: string;
  target: { kind: PromotionTargetKind; ids: Id[] };
  discountType: DiscountType;
  value: number; // percent, or an amount in `currency`
  currency?: CurrencyCode;
  startDate: IsoDate;
  endDate: IsoDate;
  branchIds: Id[];
  brandSharePercent: number; // of the discount, paid by the brand
  commissionOnOriginal: boolean;
  requestedByBrandId?: Id; // a brand asked for it; the owner approves or rejects
  decision?: 'approved' | 'rejected';
  decisionReason?: string;
  endedEarlyAt?: IsoDateTime;
  byId: Id;
  at: IsoDateTime;
}

export type PromoCodeKind = 'promo' | 'influencer';

export interface PromoCode {
  id: Id;
  code: string;
  kind: PromoCodeKind;
  influencer?: string;
  discountType: DiscountType;
  value: number;
  currency?: CurrencyCode;
  brandSharePercent: number;
  startDate: IsoDate;
  endDate: IsoDate;
  active: boolean;
  byId: Id;
  at: IsoDateTime;
}
