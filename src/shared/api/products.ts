import type { Category, CurrencyCode, Id, IsoDate, Localized, PriceList, PriceSchedule, Product, ScheduleKind, Variant } from '@/shared/types';
import { convert, currentTerms, makeEan13, nowIso, priceMargins, rateOn, regularPrice, sellingPrice, stockLevels, vatRateOn, type StockLevel } from '@/shared/utils';
import { onHandStatuses } from '@/shared/constants/statuses';
import type { Database } from './database';
import { currentUnitCost } from './engine';
import { ApiError } from './errors';
import { actor, db, diff, findById, logActivity, mutate, newId, notify, respond } from './server';

// ---- Shared rules ---------------------------------------------------------------------------------------------

// The VAT rate the store charges in a currency today (the country of the branches that use it).
export const vatForCurrency = (data: Database, currency: CurrencyCode) => {
  const branch = data.branches.find((current) => current.currency === currency && !current.archived);
  return branch ? vatRateOn(data.vatRates, branch.countryCode, new Date().toISOString()) : 0;
};

// The minimum margin that applies to a product: its brand's, else its category's, else the store's default.
export const minMarginFor = (data: Database, product: Product) => {
  const brand = data.brands.find((current) => current.id === product.brandId);
  const category = data.categories.find((current) => current.id === product.categoryId);
  return (brand && currentTerms(brand).minMargin) ?? category?.minMargin ?? data.settings.defaultMinMargin;
};

export interface CurrencyPricing {
  currency: CurrencyCode;
  price: number | null; // today's regular price
  salePrice: number | null; // a running sale price
  unitCost: number; // in this currency, today's rate
  vatRate: number;
  margin: number | null;
  markup: number | null;
  belowMinimum: boolean;
}

// Price, cost, margin and markup for each currency the store sells in. Commission brands: the store's
// "cost" is what it pays the brand, so the margin is the commission.
export const productPricing = (data: Database, product: Product): CurrencyPricing[] => {
  const now = new Date().toISOString();
  const { baseCurrency } = data.settings;
  const baseCost = currentUnitCost(data, product.id, now);
  const brand = data.brands.find((current) => current.id === product.brandId);
  const terms = brand ? currentTerms(brand) : undefined;
  const minimum = minMarginFor(data, product);
  return sellingCurrencies(data).map((currency) => {
    const price = regularPrice(data.schedules, product, undefined, currency, now) ?? null;
    const sale = sellingPrice(data.schedules, product, undefined, currency, now);
    const vatRate = vatForCurrency(data, currency);
    const rate = rateOn(data.rates, currency, now, baseCurrency) ?? 1;
    const unitCost = terms?.model === 'commission' && price !== null ? (price / (1 + vatRate / 100)) * (1 - terms.commissionRate / 100) : baseCost / rate;
    const margins = price !== null ? priceMargins(price, unitCost, vatRate) : null;
    return {
      currency,
      price,
      salePrice: sale !== undefined && sale !== price ? sale : null,
      unitCost,
      vatRate,
      margin: margins?.margin ?? null,
      markup: margins?.markup ?? null,
      belowMinimum: margins !== null && margins.margin < minimum,
    };
  });
};

// The currencies the store sells in: those of its active branches.
export const sellingCurrencies = (data: Database) => [...new Set(data.branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse').map((branch) => branch.currency))];

const allVariants = (except?: Id) => db.products.flatMap((product) => (product.id === except ? [] : product.variants));

const checkUnique = (variants: Variant[], productId?: Id) => {
  const others = allVariants(productId);
  const barcodes = new Set(others.map((variant) => variant.barcode));
  const skus = new Set(others.map((variant) => variant.sku));
  const seenBarcodes = new Set<string>();
  const seenSkus = new Set<string>();
  variants.forEach((variant) => {
    if (variant.barcode && (barcodes.has(variant.barcode) || seenBarcodes.has(variant.barcode))) throw new ApiError('duplicateBarcode');
    if (variant.sku && (skus.has(variant.sku) || seenSkus.has(variant.sku))) throw new ApiError('duplicateSku');
    seenBarcodes.add(variant.barcode);
    seenSkus.add(variant.sku);
  });
};

// A new EAN-13 barcode with the store's prefix that no item uses yet.
const freshBarcode = (taken: Set<string>) => {
  let sequence = (db.counters.barcode ?? 5000) + 1;
  let code = makeEan13(db.settings.barcodePrefix, sequence);
  while (taken.has(code)) {
    sequence += 1;
    code = makeEan13(db.settings.barcodePrefix, sequence);
  }
  db.counters.barcode = sequence;
  return code;
};

// ---- Listing --------------------------------------------------------------------------------------------------

export interface ProductFilter {
  query?: string;
  brandId?: Id;
  categoryId?: Id;
  branchId?: Id; // only products with stock in this branch
  season?: string;
  archived?: boolean;
}

export interface ProductRow {
  product: Product;
  pricing: CurrencyPricing[];
  stock: number;
  belowMinimum: boolean;
  missingPrice: CurrencyCode[];
}

const unitsByProduct = (levels: StockLevel[], branchId?: Id) => {
  const productOf = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, product.id] as const)));
  const units = new Map<Id, number>();
  levels.forEach((level) => {
    if (!onHandStatuses.includes(level.status) || (branchId && level.branchId !== branchId)) return;
    const productId = productOf.get(level.variantId);
    if (productId) units.set(productId, (units.get(productId) ?? 0) + level.qty);
  });
  return units;
};

export const listProducts = (filter: ProductFilter) =>
  respond((): ProductRow[] => {
    const query = filter.query?.trim().toLowerCase() ?? '';
    const units = unitsByProduct(stockLevels(db.movements), filter.branchId);
    const currencies = sellingCurrencies(db);
    return db.products
      .filter(
        (product) =>
          Boolean(product.archived) === Boolean(filter.archived) &&
          (!filter.brandId || product.brandId === filter.brandId) &&
          (!filter.categoryId || product.categoryId === filter.categoryId) &&
          (!filter.season || product.season === filter.season) &&
          (!filter.branchId || (units.get(product.id) ?? 0) > 0) &&
          (!query ||
            product.name.toLowerCase().includes(query) ||
            product.collection.toLowerCase().includes(query) ||
            product.variants.some((variant) => variant.sku.toLowerCase().includes(query) || variant.barcode.includes(query))),
      )
      .map((product) => {
        const pricing = productPricing(db, product);
        return {
          product,
          pricing,
          stock: units.get(product.id) ?? 0,
          belowMinimum: pricing.some((row) => row.belowMinimum),
          missingPrice: currencies.filter((currency) => product.prices[currency] === undefined),
        };
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
  });

export interface PriceHistoryRow {
  id: Id;
  at: string;
  byId: Id;
  kind: 'price' | 'cost' | 'scheduled';
  currency: CurrencyCode;
  variantId?: Id;
  from: number | null;
  to: number | null;
}

export const getProduct = (productId: Id) =>
  respond(() => {
    const product = findById(db.products, productId);
    const levels = stockLevels(db.movements).filter((level) => product.variants.some((variant) => variant.id === level.variantId));
    const history: PriceHistoryRow[] = [
      ...db.priceChanges.filter((change) => change.productId === productId).map((change) => ({ ...change, kind: change.kind })),
      ...db.schedules
        .filter((schedule) => schedule.productId === productId && schedule.kind === 'change' && !schedule.cancelled && schedule.startDate <= nowIso().slice(0, 10))
        .map((schedule) => ({ id: schedule.id, at: `${schedule.startDate}T00:00:00.000Z`, byId: schedule.byId, kind: 'scheduled' as const, currency: schedule.currency, variantId: schedule.variantId, from: null, to: schedule.price })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    const brand = db.brands.find((current) => current.id === product.brandId);
    return {
      product,
      model: brand ? currentTerms(brand).model : 'own',
      pricing: productPricing(db, product),
      minMargin: minMarginFor(db, product),
      unitCost: currentUnitCost(db, product.id),
      baseCurrency: db.settings.baseCurrency,
      currencies: sellingCurrencies(db),
      levels: levels.filter((level) => onHandStatuses.includes(level.status)),
      schedules: db.schedules.filter((schedule) => schedule.productId === productId).sort((a, b) => b.startDate.localeCompare(a.startDate)),
      history,
      batches: db.batches.filter((batch) => batch.productId === productId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    };
  });

// ---- Creating and editing ------------------------------------------------------------------------------------

export interface ProductInput {
  brandId: Id;
  categoryId: Id;
  name: string;
  photo?: string;
  season: string;
  collection: string;
  sizes: string[];
  colors: string[];
  cost: number;
  prices: PriceList;
}

// One variant per size and colour. Existing combinations keep their SKU, barcode and history;
// combinations no longer chosen are archived, not deleted.
const buildVariants = (input: ProductInput, existing: Variant[], skuBase: string) => {
  const taken = new Set(allVariants().map((variant) => variant.barcode));
  const variants: Variant[] = [];
  input.colors.forEach((color, colorIndex) =>
    input.sizes.forEach((size, sizeIndex) => {
      const match = existing.find((variant) => variant.size === size && variant.color === color);
      if (match) {
        variants.push({ ...match, archived: false });
        return;
      }
      const barcode = freshBarcode(taken);
      taken.add(barcode);
      variants.push({ id: newId(), size, color, sku: `${skuBase}-${colorIndex + 1}-${sizeIndex + 1}`, barcode, barcodeGenerated: true, prices: {}, archived: false });
    }),
  );
  existing.filter((variant) => !variants.some((current) => current.id === variant.id)).forEach((variant) => variants.push({ ...variant, archived: true }));
  return variants;
};

const recordPriceChanges = (product: Product, before: PriceList, after: PriceList, variantId?: Id) => {
  const me = actor().id;
  const at = nowIso();
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach((currency) => {
    if (before[currency] === after[currency]) return;
    db.priceChanges.push({ id: newId(), productId: product.id, variantId, kind: 'price', currency, from: before[currency] ?? null, to: after[currency] ?? null, at, byId: me });
    product.pricesSavedAt = { ...product.pricesSavedAt, [currency]: at };
  });
};

// Alerts the owners when a product sells below its minimum margin after a cost or price change.
const warnMargins = (product: Product) => {
  productPricing(db, product)
    .filter((row) => row.belowMinimum)
    .forEach((row) => notify('belowMargin', { product: product.name, currency: row.currency, margin: `${Math.round(row.margin ?? 0)}%`, minimum: `${minMarginFor(db, product)}%` }, `/owner/products/${product.id}?tab=pricing`));
};

export const createProduct = (input: ProductInput) =>
  mutate(() => {
    const id = newId();
    const skuBase = String(7000 + db.products.length + 1);
    const product: Product = {
      id,
      brandId: input.brandId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      photo: input.photo,
      season: input.season,
      collection: input.collection,
      prices: {},
      cost: input.cost,
      variants: [],
      archived: false,
      createdAt: nowIso(),
    };
    product.variants = buildVariants(input, [], skuBase);
    checkUnique(product.variants);
    db.products.push(product);
    recordPriceChanges(product, {}, input.prices);
    product.prices = { ...input.prices };
    logActivity({ action: 'create', target: { type: 'product', id, label: product.name } });
    return product;
  });

export const updateProduct = (productId: Id, input: ProductInput) =>
  mutate(() => {
    const product = findById(db.products, productId);
    const before = structuredClone(product);
    const skuBase = product.variants[0]?.sku.split('-')[0] ?? String(7000 + db.products.length);
    const variants = buildVariants(input, product.variants, skuBase);
    checkUnique(variants, productId);
    Object.assign(product, { brandId: input.brandId, categoryId: input.categoryId, name: input.name.trim(), photo: input.photo, season: input.season, collection: input.collection, variants });
    logActivity({ action: 'update', target: { type: 'product', id: productId, label: product.name }, changes: diff(before, product, ['brandId', 'categoryId', 'name', 'season', 'collection']) });
    return product;
  });

// Each variant's SKU and barcode; a barcode already used anywhere is refused.
export const updateVariants = (productId: Id, variants: Pick<Variant, 'id' | 'sku' | 'barcode' | 'barcodeGenerated'>[]) =>
  mutate(() => {
    const product = findById(db.products, productId);
    const next = product.variants.map((variant) => {
      const change = variants.find((current) => current.id === variant.id);
      return change ? { ...variant, sku: change.sku.trim(), barcode: change.barcode.trim(), barcodeGenerated: change.barcodeGenerated } : variant;
    });
    checkUnique(next, productId);
    product.variants = next;
    logActivity({ action: 'update', target: { type: 'product', id: productId, label: product.name }, changes: [{ field: 'variants', from: null, to: variants.length }] });
    return product;
  });

// Reserves a fresh barcode for an item that came without one.
export const generateBarcode = () =>
  mutate(() => freshBarcode(new Set(allVariants().map((variant) => variant.barcode))));

export const isBarcodeTaken = (barcode: string, productId?: Id) =>
  respond(() => allVariants(productId).some((variant) => variant.barcode === barcode.trim()));

export const setProductArchived = (productId: Id, archived: boolean) =>
  mutate(() => {
    const product = findById(db.products, productId);
    product.archived = archived;
    logActivity({ action: archived ? 'archive' : 'restore', target: { type: 'product', id: productId, label: product.name } });
    return product;
  });

// ---- Prices and cost ------------------------------------------------------------------------------------------

// The product's price per currency, and any variant's own price (null removes it). Each change is kept in the history.
export const setPrices = (productId: Id, prices: PriceList, variantPrices: Record<Id, Record<CurrencyCode, number | null>> = {}) =>
  mutate(() => {
    const product = findById(db.products, productId);
    const before = { ...product.prices };
    recordPriceChanges(product, before, prices);
    product.prices = { ...prices };
    Object.entries(variantPrices).forEach(([variantId, perCurrency]) => {
      const variant = product.variants.find((current) => current.id === variantId);
      if (!variant) return;
      const old = { ...variant.prices };
      const next: PriceList = { ...variant.prices };
      Object.entries(perCurrency).forEach(([currency, price]) => {
        if (price === null) delete next[currency];
        else next[currency] = price;
      });
      recordPriceChanges(product, old, next, variantId);
      variant.prices = next;
    });
    logActivity({
      action: 'priceChange',
      target: { type: 'product', id: productId, label: product.name },
      changes: diff({ prices: before }, { prices: product.prices }, ['prices']),
      flagged: db.settings.flagRules.priceChanges,
    });
    warnMargins(product);
    return product;
  });

export const setProductCost = (productId: Id, cost: number) =>
  mutate(() => {
    const product = findById(db.products, productId);
    const from = product.cost;
    product.cost = cost;
    db.priceChanges.push({ id: newId(), productId, kind: 'cost', currency: db.settings.baseCurrency, from, to: cost, at: nowIso(), byId: actor().id });
    logActivity({ action: 'costChange', target: { type: 'product', id: productId, label: product.name }, changes: [{ field: 'cost', from, to: cost }], flagged: db.settings.flagRules.costChanges });
    warnMargins(product);
    return productPricing(db, product).filter((row) => row.belowMinimum);
  });

export interface ScheduleInput {
  productId: Id;
  variantId?: Id;
  kind: ScheduleKind;
  currency: CurrencyCode;
  price: number;
  startDate: IsoDate;
  endDate?: IsoDate;
}

export const schedulePrice = (input: ScheduleInput) =>
  mutate(() => {
    const product = findById(db.products, input.productId);
    const schedule: PriceSchedule = { id: newId(), ...input, cancelled: false, byId: actor().id, at: nowIso() };
    db.schedules.push(schedule);
    logActivity({ action: 'priceChange', target: { type: 'product', id: product.id, label: product.name }, changes: [{ field: `${input.kind} ${input.currency}`, from: input.startDate, to: input.price }] });
    return schedule;
  });

export const cancelSchedule = (scheduleId: Id) =>
  mutate(() => {
    const schedule = findById(db.schedules, scheduleId);
    schedule.cancelled = true;
    return schedule;
  });

// ---- Categories -----------------------------------------------------------------------------------------------

export const listCategories = () =>
  respond(() =>
    db.categories.map((category) => ({
      category,
      productCount: db.products.filter((product) => product.categoryId === category.id && !product.archived).length,
    })),
  );

export const saveCategory = (input: { id?: Id; name: Localized; minMargin: number | null }) =>
  mutate(() => {
    if (input.id) {
      const category = findById(db.categories, input.id);
      const before = { ...category };
      Object.assign(category, { name: input.name, minMargin: input.minMargin });
      logActivity({ action: 'update', target: { type: 'category', id: category.id, label: category.name.en }, changes: diff(before, category, ['name', 'minMargin']) });
      return category;
    }
    const category: Category = { id: newId(), name: input.name, minMargin: input.minMargin, archived: false };
    db.categories.push(category);
    logActivity({ action: 'create', target: { type: 'category', id: category.id, label: category.name.en } });
    return category;
  });

export const setCategoryArchived = (categoryId: Id, archived: boolean) =>
  mutate(() => {
    const category = findById(db.categories, categoryId);
    category.archived = archived;
    logActivity({ action: archived ? 'archive' : 'restore', target: { type: 'category', id: categoryId, label: category.name.en } });
    return category;
  });

// ---- Import ---------------------------------------------------------------------------------------------------

// One row of an import file: a variant of a product.
export interface ImportRow {
  line: number;
  brand: string;
  category: string;
  name: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  prices: PriceList;
  cost: number;
  season: string;
  collection: string;
}

export type ImportProblem = 'unknownBrand' | 'unknownCategory' | 'missingName' | 'duplicateBarcode' | 'duplicateSku' | 'invalidPrice';

export interface ImportCheck {
  row: ImportRow;
  problems: ImportProblem[];
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Checks the rows before anything is saved: every problem is listed per row.
export const checkImport = (rows: ImportRow[]) =>
  respond((): ImportCheck[] => {
    const barcodes = new Set(allVariants().map((variant) => variant.barcode));
    const skus = new Set(allVariants().map((variant) => variant.sku));
    const seenBarcodes = new Set<string>();
    const seenSkus = new Set<string>();
    return rows.map((row) => {
      const problems: ImportProblem[] = [];
      if (!db.brands.some((brand) => sameName(brand.name, row.brand))) problems.push('unknownBrand');
      if (!db.categories.some((category) => sameName(category.name.en, row.category) || sameName(category.name.ar, row.category))) problems.push('unknownCategory');
      if (!row.name.trim()) problems.push('missingName');
      if (row.barcode && (barcodes.has(row.barcode) || seenBarcodes.has(row.barcode))) problems.push('duplicateBarcode');
      if (row.sku && (skus.has(row.sku) || seenSkus.has(row.sku))) problems.push('duplicateSku');
      if (Object.values(row.prices).some((price) => !Number.isFinite(price) || price < 0)) problems.push('invalidPrice');
      if (row.barcode) seenBarcodes.add(row.barcode);
      if (row.sku) seenSkus.add(row.sku);
      return { row, problems };
    });
  });

// Saves the rows without problems: rows with the same brand and name become one product.
export const importProducts = (rows: ImportRow[]) =>
  mutate(() => {
    const groups = new Map<string, ImportRow[]>();
    rows.forEach((row) => {
      const key = `${row.brand.toLowerCase()}|${row.name.trim().toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    const taken = new Set(allVariants().map((variant) => variant.barcode));
    const created: Product[] = [];
    groups.forEach((group) => {
      const first = group[0];
      const brand = db.brands.find((current) => sameName(current.name, first.brand));
      const category = db.categories.find((current) => sameName(current.name.en, first.category) || sameName(current.name.ar, first.category));
      if (!brand || !category) return;
      const skuBase = String(7000 + db.products.length + 1);
      const product: Product = {
        id: newId(),
        brandId: brand.id,
        categoryId: category.id,
        name: first.name.trim(),
        season: first.season,
        collection: first.collection,
        prices: first.prices,
        cost: first.cost,
        variants: group.map((row, index): Variant => {
          const barcode = row.barcode || freshBarcode(taken);
          taken.add(barcode);
          return { id: newId(), size: row.size, color: row.color, sku: row.sku || `${skuBase}-${index + 1}`, barcode, barcodeGenerated: !row.barcode, prices: {}, archived: false };
        }),
        archived: false,
        createdAt: nowIso(),
      };
      db.products.push(product);
      created.push(product);
    });
    logActivity({ action: 'create', target: { type: 'product', id: 'import', label: `${created.length}` } });
    return created.length;
  });

// What a converted price would be, as a hint only: prices are always entered per currency, never converted automatically.
export const convertedHint = (amount: number, from: CurrencyCode, to: CurrencyCode) =>
  respond(() => convert(amount, from, to, nowIso(), db.rates, db.settings.baseCurrency));
