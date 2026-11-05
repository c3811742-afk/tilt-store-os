import type { CurrencyCode, Id, IsoDate, IsoDateTime, Product, Promotion, PromotionState, PriceSchedule, Variant } from '@/shared/types';
import { toIsoDate } from './dates';

// A product's regular price in a currency: the variant's own price if it has one, else the product's.
export const basePrice = (product: Product, variant: Variant | undefined, currency: CurrencyCode): number | undefined =>
  variant?.prices[currency] ?? product.prices[currency];

// A sale price running on `date` for this product (or variant) and currency.
export const activeSalePrice = (schedules: readonly PriceSchedule[], product: Product, variant: Variant | undefined, currency: CurrencyCode, date: IsoDate | IsoDateTime) => {
  const day = toIsoDate(date);
  return schedules
    .filter(
      (schedule) =>
        !schedule.cancelled &&
        schedule.kind === 'sale' &&
        schedule.productId === product.id &&
        (!schedule.variantId || schedule.variantId === variant?.id) &&
        schedule.currency === currency &&
        schedule.startDate <= day &&
        (!schedule.endDate || schedule.endDate >= day),
    )
    .sort((a, b) => Number(Boolean(b.variantId)) - Number(Boolean(a.variantId)))[0];
};

// The regular price on a date: a scheduled price change that has started replaces the saved price.
export const regularPrice = (schedules: readonly PriceSchedule[], product: Product, variant: Variant | undefined, currency: CurrencyCode, date: IsoDate | IsoDateTime) => {
  const day = toIsoDate(date);
  const change = schedules
    .filter(
      (schedule) =>
        !schedule.cancelled &&
        schedule.kind === 'change' &&
        schedule.productId === product.id &&
        (!schedule.variantId || schedule.variantId === variant?.id) &&
        schedule.currency === currency &&
        schedule.startDate <= day,
    )
    .sort((a, b) => Number(Boolean(b.variantId)) - Number(Boolean(a.variantId)) || b.startDate.localeCompare(a.startDate))[0];
  // A price saved on or after the day the scheduled change started wins over it.
  return change && (product.pricesSavedAt?.[currency] ?? '') < change.startDate ? change.price : basePrice(product, variant, currency);
};

// The price a customer pays before promotions: the sale price when one is running, the regular price otherwise.
export const sellingPrice = (schedules: readonly PriceSchedule[], product: Product, variant: Variant | undefined, currency: CurrencyCode, date: IsoDate | IsoDateTime) =>
  activeSalePrice(schedules, product, variant, currency, date)?.price ?? regularPrice(schedules, product, variant, currency, date);

export const promotionState = (promotion: Promotion, day: IsoDate = toIsoDate()): PromotionState => {
  if (promotion.requestedByBrandId && !promotion.decision) return 'requested';
  if (promotion.decision === 'rejected') return 'rejected';
  if (promotion.endedEarlyAt || promotion.endDate < day) return 'ended';
  if (promotion.startDate > day) return 'scheduled';
  return 'active';
};

export const promotionCovers = (promotion: Promotion, product: Product, variantId: Id) => {
  const { kind, ids } = promotion.target;
  if (kind === 'variants') return ids.includes(variantId);
  if (kind === 'products') return ids.includes(product.id);
  if (kind === 'brand') return ids.includes(product.brandId);
  return ids.includes(product.categoryId);
};

// The promotion that applies to an item in a branch today (the biggest discount when several do).
export const activePromotion = (promotions: readonly Promotion[], product: Product, variantId: Id, branchId: Id, unitPrice: number, date: IsoDate | IsoDateTime) => {
  const day = toIsoDate(date);
  const applicable = promotions.filter(
    (promotion) => promotionState(promotion, day) === 'active' && promotion.branchIds.includes(branchId) && promotionCovers(promotion, product, variantId),
  );
  return applicable
    .map((promotion) => ({ promotion, discount: promotionDiscount(promotion, unitPrice) }))
    .sort((a, b) => b.discount - a.discount)[0];
};

// The discount per piece a promotion gives on a price.
export const promotionDiscount = (promotion: Pick<Promotion, 'discountType' | 'value'>, unitPrice: number) =>
  Math.min(promotion.discountType === 'percent' ? (unitPrice * promotion.value) / 100 : promotion.value, unitPrice);
