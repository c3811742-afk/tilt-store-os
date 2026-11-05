import type { Id, Product, PromoCode, Promotion, PromotionState } from '@/shared/types';
import { currentTerms, nowIso, promotionCovers, promotionState, today } from '@/shared/utils';
import { ApiError } from './errors';
import { salesFacts, totalsOf } from './facts';
import { actor, db, diff, findById, logActivity, mutate, newId, respond } from './server';

export interface PromotionResults {
  units: number;
  orders: number;
  sales: number; // net sales of the promoted items, reporting currency
  discount: number;
  brandShare: number; // the part of the discount the brands pay
  storeShare: number;
}

const resultsFor = (filter: { promotionId?: Id; promoCodeId?: Id; from: string; to: string }): PromotionResults => {
  const facts = salesFacts(db, { range: { from: filter.from, to: filter.to } }).filter(
    (fact) => !fact.isReturn && ((filter.promotionId && fact.promotionId === filter.promotionId) || (filter.promoCodeId && fact.promoCodeId === filter.promoCodeId)),
  );
  const totals = totalsOf(facts);
  return { units: totals.soldUnits, orders: totals.orders, sales: totals.net, discount: totals.discount, brandShare: totals.brandDiscount, storeShare: totals.storeDiscount };
};

export interface PromotionRow {
  promotion: Promotion;
  state: PromotionState;
  results: PromotionResults;
}

export const listPromotions = () =>
  respond((): PromotionRow[] =>
    db.promotions
      .map((promotion) => ({ promotion, state: promotionState(promotion), results: resultsFor({ promotionId: promotion.id, from: promotion.startDate, to: promotion.endDate }) }))
      .sort((a, b) => b.promotion.startDate.localeCompare(a.promotion.startDate)),
  );

export const getPromotion = (promotionId: Id) =>
  respond(() => {
    const promotion = findById(db.promotions, promotionId);
    return {
      promotion,
      state: promotionState(promotion),
      results: resultsFor({ promotionId, from: promotion.startDate, to: promotion.endDate }),
      blockedBrandIds: blockedBrands(promotion),
    };
  });

// Brands in a promotion whose terms don't allow discounts: their items can't be put on sale.
const blockedBrands = (promotion: Pick<Promotion, 'target'>) => {
  const affected = new Set<Id>();
  const covers = (product: Product) => product.variants.some((variant) => promotionCovers({ ...promotion, target: promotion.target } as Promotion, product, variant.id));
  db.products.filter((product) => !product.archived && covers(product)).forEach((product) => affected.add(product.brandId));
  if (promotion.target.kind === 'brand') promotion.target.ids.forEach((id) => affected.add(id));
  return [...affected].filter((brandId) => {
    const brand = db.brands.find((current) => current.id === brandId);
    return brand && !currentTerms(brand).allowDiscounts;
  });
};

export type PromotionInput = Omit<Promotion, 'id' | 'byId' | 'at' | 'decision' | 'decisionReason' | 'endedEarlyAt' | 'requestedByBrandId'>;

// A promotion can only include brands whose terms allow discounts (category promotions skip those brands' items at the till).
export const savePromotion = (input: PromotionInput, promotionId?: Id) =>
  mutate(() => {
    const blocked = input.target.kind === 'category' ? [] : blockedBrands(input as Promotion);
    if (blocked.length) throw new ApiError('discountsNotAllowed');
    if (promotionId) {
      const promotion = findById(db.promotions, promotionId);
      const before = { ...promotion };
      Object.assign(promotion, input);
      logActivity({ action: 'update', target: { type: 'promotion', id: promotion.id, label: promotion.name }, changes: diff(before, promotion, ['name', 'target', 'discountType', 'value', 'startDate', 'endDate', 'branchIds', 'brandSharePercent', 'commissionOnOriginal']) });
      return promotion;
    }
    const promotion: Promotion = { ...input, id: newId(), byId: actor().id, at: nowIso() };
    db.promotions.push(promotion);
    logActivity({ action: 'create', target: { type: 'promotion', id: promotion.id, label: promotion.name }, amount: input.value });
    return promotion;
  });

export const endPromotion = (promotionId: Id) =>
  mutate(() => {
    const promotion = findById(db.promotions, promotionId);
    promotion.endedEarlyAt = nowIso();
    promotion.endDate = today() < promotion.endDate ? today() : promotion.endDate;
    logActivity({ action: 'update', target: { type: 'promotion', id: promotion.id, label: promotion.name }, changes: [{ field: 'endedEarly', from: null, to: promotion.endedEarlyAt }] });
    return promotion;
  });

// A brand's request: approving starts it on its dates, rejecting keeps it with the reason.
export const decidePromotion = (promotionId: Id, approve: boolean, reason?: string) =>
  mutate(() => {
    const promotion = findById(db.promotions, promotionId);
    if (promotion.decision) throw new ApiError('alreadyDecided');
    if (approve && blockedBrands(promotion).length) throw new ApiError('discountsNotAllowed');
    promotion.decision = approve ? 'approved' : 'rejected';
    promotion.decisionReason = reason;
    const me = actor().id;
    db.approvals
      .filter((approval) => approval.ref?.type === 'promotion' && approval.ref.id === promotionId && approval.status === 'pending')
      .forEach((approval) => Object.assign(approval, { status: approve ? 'approved' : 'rejected', decidedById: me, decidedAt: nowIso(), reason }));
    logActivity({ action: approve ? 'approve' : 'reject', target: { type: 'promotion', id: promotion.id, label: promotion.name }, changes: reason ? [{ field: 'reason', from: null, to: reason }] : undefined });
    return promotion;
  });

// ---- Promo and influencer codes ---------------------------------------------------------------------------------

export const listPromoCodes = () =>
  respond(() => db.promoCodes.map((code) => ({ code, results: resultsFor({ promoCodeId: code.id, from: code.startDate, to: code.endDate }) })).sort((a, b) => b.code.startDate.localeCompare(a.code.startDate)));

export type PromoCodeInput = Omit<PromoCode, 'id' | 'byId' | 'at'>;

export const savePromoCode = (input: PromoCodeInput, codeId?: Id) =>
  mutate(() => {
    const code = input.code.trim().toUpperCase();
    if (db.promoCodes.some((current) => current.id !== codeId && current.code === code)) throw new ApiError('duplicateCode');
    if (codeId) {
      const existing = findById(db.promoCodes, codeId);
      Object.assign(existing, { ...input, code });
      logActivity({ action: 'update', target: { type: 'promoCode', id: existing.id, label: code } });
      return existing;
    }
    const created: PromoCode = { ...input, code, id: newId(), byId: actor().id, at: nowIso() };
    db.promoCodes.push(created);
    logActivity({ action: 'create', target: { type: 'promoCode', id: created.id, label: code } });
    return created;
  });
