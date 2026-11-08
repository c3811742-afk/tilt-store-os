import type { Id, Product, Variant } from '@/shared/types';
import { describeVariant } from './stock';
import { db, actor, respond } from './server';

// Searching the catalogue by product name, brand, SKU or barcode: the top bar and the counter find products, the
// stock screens find variants (one line per size and colour). Never returns cost. Brand partners only find their
// own brand.

const normalize = (value: string) => value.trim().toLowerCase();
const brandName = (brandId: Id) => db.brands.find((brand) => brand.id === brandId)?.name ?? '';
const liveVariants = (product: Product) => product.variants.filter((variant) => !variant.archived);

interface CatalogMatch {
  product: Product;
  variants: Variant[]; // the variants that match (every variant when the name or brand matched)
  bySku?: Variant; // the first variant whose SKU matched
}

// What a search finds. A scanned barcode or a full SKU is one exact variant, found alone so a scan adds it at once.
const matchCatalog = (query: string): { exact?: { product: Product; variant: Variant }; matches: CatalogMatch[] } => {
  const needle = normalize(query);
  if (!needle) return { matches: [] };
  const me = actor();
  const products = db.products.filter((product) => !product.archived && (!me.brandId || product.brandId === me.brandId));
  for (const product of products) {
    const variant = liveVariants(product).find((current) => current.barcode === needle || normalize(current.sku) === needle);
    if (variant) return { exact: { product, variant }, matches: [] };
  }
  return {
    matches: products.flatMap((product) => {
      const bySku = liveVariants(product).filter((variant) => normalize(variant.sku).includes(needle));
      const byName = normalize(product.name).includes(needle) || normalize(brandName(product.brandId)).includes(needle);
      if (!bySku.length && !byName) return [];
      return [{ product, variants: byName ? liveVariants(product) : bySku, bySku: bySku[0] }];
    }),
  };
};

export interface ProductHit {
  productId: Id;
  variantId?: Id; // set when the search matched one variant (its SKU or barcode)
  name: string;
  brandName: string;
  photo?: string;
  detail: string; // the matched variant's size, colour and SKU, or the brand
}

const toProductHit = (product: Product, variant?: Variant): ProductHit => ({
  productId: product.id,
  variantId: variant?.id,
  name: product.name,
  brandName: brandName(product.brandId),
  photo: product.photo,
  detail: variant ? `${variant.size} · ${variant.color} · ${variant.sku}` : brandName(product.brandId),
});

// Products, for the search in the top bar and at the counter.
export const searchProducts = (query: string, limit = 8) =>
  respond((): ProductHit[] => {
    const { exact, matches } = matchCatalog(query);
    if (exact) return [toProductHit(exact.product, exact.variant)];
    return matches.slice(0, limit).map((match) => toProductHit(match.product, match.bySku));
  });

export interface VariantHit extends ReturnType<typeof describeVariant> {
  variantId: Id;
  barcode: string;
}

const toVariantHit = (variant: Variant): VariantHit => ({ variantId: variant.id, barcode: variant.barcode, ...describeVariant(variant.id) });

// Variants, for picking items into a list (receiving, transfers, counts, returns to brands).
export const searchVariants = (query: string, limit = 20) =>
  respond((): VariantHit[] => {
    const { exact, matches } = matchCatalog(query);
    if (exact) return [toVariantHit(exact.variant)];
    return matches
      .flatMap((match) => match.variants)
      .slice(0, limit)
      .map(toVariantHit);
  });
