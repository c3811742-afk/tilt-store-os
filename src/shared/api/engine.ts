import type { Branch, Id, IsoDateTime, LocationKind, MovementKind, Product, Sale, SaleLine, StockMovement, StockPlace, StockStatus, Variant } from '@/shared/types';
import { activePromotion, sellingPrice } from '@/shared/utils/pricing';
import { batchUnitCosts, rateOn, termsOn, vatRateOn, stockLevels, qtyAt, toIsoDate } from '@/shared/utils';
import type { Database } from './database';

// The core rules every part of the system shares: where stock is, what a piece costs, how a sale is recorded.
// Each function takes the data it works on, so the seed, the live demo and the screens all use the same code.

export interface VariantEntry {
  product: Product;
  variant: Variant;
}

export const variantIndex = (data: Database) => {
  const index = new Map<Id, VariantEntry>();
  data.products.forEach((product) => product.variants.forEach((variant) => index.set(variant.id, { product, variant })));
  return index;
};

// Pieces of a variant in a branch with one status, place by place (fullest first); only places that have some.
export const piecesIn = (data: Database, variantId: Id, branchId: Id, status: StockStatus = 'available') =>
  stockLevels(data.movements.filter((movement) => movement.variantId === variantId))
    .filter((level) => level.branchId === branchId && level.status === status && level.qty > 0)
    .sort((a, b) => b.qty - a.qty);

// The same, at one place (e.g. the back room).
export const piecesAt = (data: Database, variantId: Id, branchId: Id, locationId: Id, status: StockStatus = 'available') =>
  piecesIn(data, variantId, branchId, status)
    .filter((level) => level.locationId === locationId)
    .reduce((sum, level) => sum + level.qty, 0);

export const locationOf = (branch: Branch, kind: LocationKind) => (branch.locations.find((location) => location.kind === kind) ?? branch.locations[0]).id;

export const placeIn = (branch: Branch, kind: LocationKind, status: StockStatus = 'available'): StockPlace => ({
  branchId: branch.id,
  locationId: locationOf(branch, kind),
  status,
});

export const addMovement = (
  data: Database,
  movement: Omit<StockMovement, 'id' | 'at' | 'byId'> & { at: IsoDateTime; byId: Id },
  newId: () => string,
) => {
  const record: StockMovement = { id: newId(), ...movement };
  data.movements.push(record);
  return record;
};

// What one piece of a product costs the store now, in the base currency: the latest batch's cost after defects.
export const currentUnitCost = (data: Database, productId: Id, at: IsoDateTime = new Date().toISOString()) => {
  const batch = data.batches
    .filter((current) => current.productId === productId && current.receivedAt <= at)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  const product = data.products.find((current) => current.id === productId);
  if (!batch) return product?.cost ?? 0;
  const rate = rateOn(data.rates, batch.currency, batch.receivedAt, data.settings.baseCurrency) ?? 1;
  return batchUnitCosts(batch).effective * rate;
};

export interface SaleItemInput {
  variantId: Id;
  qty: number;
  discount?: number; // a manual discount on the line, in the sale's currency
  discountReasonId?: Id;
}

export interface SaleInput {
  branchId: Id;
  cashierId: Id;
  customerId?: Id;
  at: IsoDateTime;
  items: SaleItemInput[];
  payments: { methodId: Id; share: number }[]; // shares of the total (they add up to 1)
  promoCodeId?: Id;
  eReceiptFails?: boolean;
  // Pieces available of a variant at a location; by default worked out from the movements.
  availableAt?: (variantId: Id, locationId: Id) => number;
  newId: () => string;
  number: string;
}

// Records a completed sale: prices and promotions of its day, the cost, terms, VAT and rate snapshots,
// the payments, the e-receipt, and the stock leaving the shop floor (or the back room when the floor is empty).
export const recordSale = (data: Database, input: SaleInput): Sale => {
  const branch = data.branches.find((current) => current.id === input.branchId);
  if (!branch) throw new Error(`Unknown branch ${input.branchId}`);
  const index = variantIndex(data);
  const { baseCurrency } = data.settings;
  const currency = branch.currency;
  const promoCode = data.promoCodes.find((code) => code.id === input.promoCodeId);

  const lines: SaleLine[] = input.items.flatMap((item) => {
    const entry = index.get(item.variantId);
    if (!entry) return [];
    const { product, variant } = entry;
    const brand = data.brands.find((current) => current.id === product.brandId);
    // A paused brand's items can't be sold until it is reactivated.
    if (!brand || brand.status === 'paused') return [];
    const terms = termsOn(brand, input.at);
    const unitPrice = sellingPrice(data.schedules, product, variant, currency, input.at) ?? 0;
    const promo = terms.allowDiscounts ? activePromotion(data.promotions, product, variant.id, branch.id, unitPrice, input.at) : undefined;
    const codeDiscount = promoCode && terms.allowDiscounts ? (promoCode.discountType === 'percent' ? (unitPrice * promoCode.value) / 100 : promoCode.value) : 0;
    const manual = terms.allowDiscounts ? (item.discount ?? 0) : 0;
    const discount = Math.min((promo?.discount ?? 0) * item.qty + codeDiscount * item.qty + manual, unitPrice * item.qty);
    const brandSharePercent = promo
      ? promo.promotion.brandSharePercent
      : promoCode
        ? promoCode.brandSharePercent
        : terms.discountFunding === 'brand'
          ? 100
          : terms.discountFunding === 'store'
            ? 0
            : terms.brandSharePercent;
    return [
      {
        id: input.newId(),
        productId: product.id,
        variantId: variant.id,
        brandId: product.brandId,
        categoryId: product.categoryId,
        qty: item.qty,
        unitPrice,
        discount,
        discountReasonId: manual ? item.discountReasonId : undefined,
        discountById: manual ? input.cashierId : undefined,
        promotionId: promo?.promotion.id,
        promoCodeId: codeDiscount ? promoCode?.id : undefined,
        brandSharePercent,
        commissionOnOriginal: promo?.promotion.commissionOnOriginal ?? false,
        unitCost: currentUnitCost(data, product.id, input.at),
        commissionRate: terms.model === 'commission' ? terms.commissionRate : 0,
        model: terms.model,
      },
    ];
  });

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.qty - line.discount, 0);
  const country = data.settings.countries.find((current) => current.countryCode === branch.countryCode);
  const device = data.devices.find((current) => current.branchId === branch.id);
  const authority = country?.authority ?? 'none';
  const deviceProblem = authority !== 'none' && device?.registration.status !== 'registered';
  const failed = authority !== 'none' && (deviceProblem || input.eReceiptFails);

  const sale: Sale = {
    id: input.newId(),
    number: input.number,
    branchId: branch.id,
    channel: branch.kind === 'online' ? 'online' : 'store',
    at: input.at,
    cashierId: input.cashierId,
    customerId: input.customerId,
    currency,
    rate: rateOn(data.rates, currency, input.at, baseCurrency) ?? 1,
    vatRate: vatRateOn(data.vatRates, branch.countryCode, input.at),
    lines,
    payments: input.payments.map((payment) => {
      const method = data.settings.paymentMethods.find((current) => current.id === payment.methodId);
      return { methodId: payment.methodId, amount: Math.round(total * payment.share * 100) / 100, feePercent: method?.feePercent ?? 0 };
    }),
    eReceipt: {
      authority,
      status: authority === 'none' ? 'notRequired' : failed ? 'failed' : 'sent',
      deviceId: device?.id,
      error: failed ? (deviceProblem ? 'deviceNotRegistered' : 'timeout') : undefined,
      attempts: authority === 'none' ? 0 : 1,
      lastAttemptAt: authority === 'none' ? undefined : input.at,
    },
  };
  data.sales.push(sale);

  // Stock leaves the shop floor first, then the back room.
  const availableAt =
    input.availableAt ??
    (() => {
      const levels = stockLevels(data.movements.filter((movement) => lines.some((line) => line.variantId === movement.variantId)));
      return (variantId: Id, locationId: Id) =>
        levels.filter((level) => level.variantId === variantId && level.branchId === branch.id && level.locationId === locationId && level.status === 'available').reduce((sum, level) => sum + level.qty, 0);
    })();
  lines.forEach((line) => {
    let remaining = line.qty;
    (['floor', 'backRoom', 'storage'] as LocationKind[]).forEach((kind) => {
      if (!remaining) return;
      const place = placeIn(branch, kind);
      const here = availableAt(line.variantId, place.locationId);
      const take = kind === 'storage' ? remaining : Math.min(here, remaining);
      if (take <= 0) return;
      addMovement(data, { variantId: line.variantId, qty: take, from: place, kind: 'sale', ref: { type: 'sale', id: sale.id }, at: input.at, byId: input.cashierId }, input.newId);
      remaining -= take;
    });
  });
  return sale;
};

// Pieces of a variant available to sell in a branch.
export const availableIn = (data: Database, variantId: Id, branchId: Id) =>
  qtyAt(stockLevels(data.movements.filter((movement) => movement.variantId === variantId)), variantId, branchId, 'available');

export const movementKinds: readonly MovementKind[] = ['receive', 'sale', 'return', 'transferOut', 'transferIn', 'adjust', 'statusChange', 'move', 'writeOff', 'returnToBrand'];

export const dayOf = (at: IsoDateTime) => toIsoDate(at);
