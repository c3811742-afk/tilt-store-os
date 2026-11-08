import { routes } from '@/shared/constants';
import type { Id, Promotion, PromotionState } from '@/shared/types';
import { datesIn, nowIso, promotionState, stockLevels, today, toIsoDate, type DateRange } from '@/shared/utils';
import { variantIndex } from './engine';
import { ApiError } from './errors';
import { salesFacts, type Fact } from './facts';
import { actor, db, logActivity, mutate, newId, notify, respond } from './server';

// The brand portal: a brand partner sees only their own brand's units, stock, returns, defects and promotions.
// Never GenZ's costs, margins, commission, other brands or customers: only quantities and their own requests.

const myBrand = () => {
  const brandId = actor().brandId;
  const brand = brandId && db.brands.find((current) => current.id === brandId);
  if (!brand) throw new ApiError('notAllowed');
  return brand;
};

const sellingBranches = () => db.branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse');
const branchName = (branchId: Id) => db.branches.find((branch) => branch.id === branchId)?.name ?? '';

// Units only: a sale adds its pieces, a return takes them away.
const unitsOf = (facts: Fact[]) => ({
  sold: facts.filter((fact) => !fact.isReturn).reduce((sum, fact) => sum + fact.figures.units, 0),
  returned: Math.abs(facts.filter((fact) => fact.isReturn).reduce((sum, fact) => sum + fact.figures.units, 0)),
});

const minimumFor = (variantId: Id, branchId: Id) => db.minQty[`${variantId}|${branchId}`] ?? db.settings.lowStockDefault;

export interface BrandStockRow {
  productId: Id;
  variantId: Id;
  name: string;
  size: string;
  color: string;
  sku: string;
  byBranch: Record<Id, number>; // available pieces per branch (and the warehouse)
  total: number;
  low: { branchId: Id; qty: number; minimum: number }[]; // selling branches at or under their minimum
}

const stockRows = (brandId: Id): BrandStockRow[] => {
  const products = db.products.filter((product) => product.brandId === brandId && !product.archived);
  const variantIds = new Set(products.flatMap((product) => product.variants.map((variant) => variant.id)));
  const levels = stockLevels(db.movements.filter((movement) => variantIds.has(movement.variantId))).filter((level) => level.status === 'available');
  const branches = db.branches.filter((branch) => !branch.archived);
  return products.flatMap((product) =>
    product.variants
      .filter((variant) => !variant.archived)
      .map((variant) => {
        const byBranch = Object.fromEntries(branches.map((branch) => [branch.id, levels.filter((level) => level.variantId === variant.id && level.branchId === branch.id).reduce((sum, level) => sum + level.qty, 0)]));
        const low = sellingBranches()
          .filter((branch) => branch.kind === 'store')
          .map((branch) => ({ branchId: branch.id, qty: byBranch[branch.id] ?? 0, minimum: minimumFor(variant.id, branch.id) }))
          .filter((entry) => entry.qty <= entry.minimum);
        return { productId: product.id, variantId: variant.id, name: product.name, size: variant.size, color: variant.color, sku: variant.sku, byBranch, total: Object.values(byBranch).reduce((sum, qty) => sum + qty, 0), low };
      }),
  );
};

export interface BrandOverview {
  brandName: string;
  range: DateRange;
  sold: number;
  returned: number;
  inStock: number;
  lowItems: number;
  openDefects: number;
  runningPromotions: number;
  topProducts: { productId: Id; name: string; units: number }[];
}

export const getBrandOverview = (range: DateRange) =>
  respond((): BrandOverview => {
    const brand = myBrand();
    const facts = salesFacts(db, { range, brandIds: [brand.id] });
    const units = unitsOf(facts);
    const stock = stockRows(brand.id);
    const byProduct = new Map<Id, number>();
    facts.filter((fact) => !fact.isReturn).forEach((fact) => byProduct.set(fact.productId, (byProduct.get(fact.productId) ?? 0) + fact.figures.units));
    return {
      brandName: brand.name,
      range,
      sold: units.sold,
      returned: units.returned,
      inStock: stock.reduce((sum, row) => sum + row.total, 0),
      lowItems: stock.filter((row) => row.low.length > 0).length,
      openDefects: db.defects.filter((defect) => defect.status === 'open' && db.products.find((product) => product.id === defect.productId)?.brandId === brand.id).length,
      runningPromotions: brandPromotions(brand.id).filter((promotion) => promotionState(promotion) === 'active').length,
      topProducts: [...byProduct]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([productId, count]) => ({ productId, name: db.products.find((product) => product.id === productId)?.name ?? '', units: count })),
    };
  });

export interface BrandSales {
  range: DateRange;
  sold: number;
  returned: number;
  byBranch: { branchId: Id; name: string; sold: number; returned: number }[];
  byDay: { day: string; sold: number }[];
  byProduct: { productId: Id; name: string; sold: number; returned: number }[];
}

// Units sold of the brand's products, by branch and by day.
export const getBrandUnits = (range: DateRange, branchId?: Id) =>
  respond((): BrandSales => {
    const brand = myBrand();
    const facts = salesFacts(db, { range, brandIds: [brand.id], branchIds: branchId ? [branchId] : undefined });
    const days = new Map<string, number>();
    facts.filter((fact) => !fact.isReturn).forEach((fact) => days.set(fact.day, (days.get(fact.day) ?? 0) + fact.figures.units));
    const products = new Map<Id, Fact[]>();
    facts.forEach((fact) => products.set(fact.productId, [...(products.get(fact.productId) ?? []), fact]));
    return {
      range,
      ...unitsOf(facts),
      byBranch: sellingBranches().map((branch) => ({ branchId: branch.id, name: branch.name, ...unitsOf(facts.filter((fact) => fact.branchId === branch.id)) })),
      byDay: datesIn({ from: range.from, to: range.to < today() ? range.to : today() }).map((day) => ({ day, sold: days.get(day) ?? 0 })), // every day, also the ones with no sales
      byProduct: [...products]
        .map(([productId, list]) => ({ productId, name: db.products.find((product) => product.id === productId)?.name ?? '', ...unitsOf(list) }))
        .sort((a, b) => b.sold - a.sold),
    };
  });

// What is left of the brand's stock, per branch, size and colour, and what is low.
export const getBrandStock = () =>
  respond(() => {
    const brand = myBrand();
    return { branches: db.branches.filter((branch) => !branch.archived).map((branch) => ({ id: branch.id, name: branch.name, kind: branch.kind })), rows: stockRows(brand.id) };
  });

export interface BrandReturnRow {
  id: Id;
  at: string;
  branchName: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  reasonId: Id;
  condition: string;
}

export interface BrandDefectRow {
  id: Id;
  at: string;
  branchName: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  reasonId: Id;
  status: string;
  liability: string;
}

// Returns and defects of the brand's products. No customer details.
export const getBrandReturns = (range: DateRange) =>
  respond(() => {
    const brand = myBrand();
    const index = variantIndex(db);
    const inRange = (at: string) => toIsoDate(at) >= range.from && toIsoDate(at) <= range.to;
    const returns: BrandReturnRow[] = db.returns
      .filter((saleReturn) => inRange(saleReturn.at))
      .flatMap((saleReturn) => {
        const sale = db.sales.find((current) => current.id === saleReturn.saleId);
        return saleReturn.lines.flatMap((line) => {
          const saleLine = sale?.lines.find((current) => current.id === line.saleLineId);
          if (!saleLine || saleLine.brandId !== brand.id) return [];
          const entry = index.get(saleLine.variantId);
          return [{ id: `${saleReturn.id}-${line.saleLineId}`, at: saleReturn.at, branchName: branchName(saleReturn.branchId), name: entry?.product.name ?? '', size: entry?.variant.size ?? '', color: entry?.variant.color ?? '', qty: line.qty, reasonId: line.reasonId, condition: line.condition }];
        });
      })
      .sort((a, b) => b.at.localeCompare(a.at));
    const defects: BrandDefectRow[] = db.defects
      .filter((defect) => inRange(defect.at) && db.products.find((product) => product.id === defect.productId)?.brandId === brand.id)
      .map((defect) => {
        const entry = index.get(defect.variantId);
        return { id: defect.id, at: defect.at, branchName: branchName(defect.branchId), name: entry?.product.name ?? '', size: entry?.variant.size ?? '', color: entry?.variant.color ?? '', qty: defect.qty, reasonId: defect.reasonId, status: defect.status, liability: defect.liability };
      })
      .sort((a, b) => b.at.localeCompare(a.at));
    return { returns, defects };
  });

// Promotions that cover the brand's products, or that the brand asked for.
const brandPromotions = (brandId: Id) => {
  const productIds = new Set(db.products.filter((product) => product.brandId === brandId).map((product) => product.id));
  const variantIds = new Set(db.products.filter((product) => product.brandId === brandId).flatMap((product) => product.variants.map((variant) => variant.id)));
  return db.promotions.filter((promotion) => {
    if (promotion.requestedByBrandId === brandId) return true;
    const { kind, ids } = promotion.target;
    if (kind === 'brand') return ids.includes(brandId);
    if (kind === 'products') return ids.some((id) => productIds.has(id));
    if (kind === 'variants') return ids.some((id) => variantIds.has(id));
    return false;
  });
};

export interface BrandPromotionRow {
  id: Id;
  name: string;
  state: PromotionState;
  discountType: Promotion['discountType'];
  value: number;
  currency?: string;
  startDate: string;
  endDate: string;
  branchNames: string[];
  products: string[];
  requested: boolean;
  decisionReason?: string;
  units: number; // pieces of the brand sold with this promotion
}

// The brand's promotions and requests, with the units sold during each.
export const listBrandPromotions = () =>
  respond((): BrandPromotionRow[] => {
    const brand = myBrand();
    return brandPromotions(brand.id)
      .map((promotion) => {
        const facts = salesFacts(db, { range: { from: promotion.startDate, to: promotion.endDate }, brandIds: [brand.id] }).filter((fact) => !fact.isReturn && fact.promotionId === promotion.id);
        return {
          id: promotion.id,
          name: promotion.name,
          state: promotionState(promotion),
          discountType: promotion.discountType,
          value: promotion.value,
          currency: promotion.currency,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          branchNames: promotion.branchIds.map(branchName),
          products: promotion.target.kind === 'products' ? promotion.target.ids.map((id) => db.products.find((product) => product.id === id)?.name ?? '').filter(Boolean) : [],
          requested: promotion.requestedByBrandId === brand.id,
          decisionReason: promotion.decisionReason,
          units: facts.reduce((sum, fact) => sum + fact.figures.units, 0),
        };
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  });

export interface PromotionRequestInput {
  name: string;
  percent: number;
  startDate: string;
  endDate: string;
  productIds: Id[];
  branchIds: Id[];
}

// The brand asks for a discount on its products; the owner approves or rejects it on Promotions or Approvals.
export const requestBrandPromotion = (input: PromotionRequestInput) =>
  mutate((): Promotion => {
    const brand = myBrand();
    const me = actor();
    const own = new Set(db.products.filter((product) => product.brandId === brand.id).map((product) => product.id));
    if (!input.productIds.length || input.productIds.some((id) => !own.has(id))) throw new ApiError('notAllowed');
    if (input.endDate < input.startDate || input.startDate < today()) throw new ApiError('notAllowed');
    const promotion: Promotion = {
      id: newId(),
      name: input.name.trim(),
      target: { kind: 'products', ids: input.productIds },
      discountType: 'percent',
      value: input.percent,
      startDate: input.startDate,
      endDate: input.endDate,
      branchIds: input.branchIds,
      brandSharePercent: 100,
      commissionOnOriginal: false,
      requestedByBrandId: brand.id,
      byId: me.id,
      at: nowIso(),
    };
    db.promotions.push(promotion);
    db.approvals.unshift({ id: newId(), kind: 'promotion', level: 'owner', requestedById: me.id, at: promotion.at, percent: input.percent, ref: { type: 'promotion', id: promotion.id }, summary: `${brand.name}: ${promotion.name}`, status: 'pending', channel: 'app' });
    notify('approvalWaiting', { summary: `${brand.name}: ${promotion.name}`, user: me.name }, routes.owner.approvals);
    logActivity({ action: 'create', target: { type: 'promotion', id: promotion.id, label: promotion.name }, amount: input.percent });
    return promotion;
  });
