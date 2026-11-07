import type { Id } from '@/shared/types';
import { db, actor, respond } from './server';

export interface ProductHit {
  productId: Id;
  variantId?: Id; // set when the search matched one variant (its SKU or barcode)
  name: string;
  brandName: string;
  photo?: string;
  detail: string; // the matched variant's size, colour and SKU, or the brand
}

const normalize = (value: string) => value.trim().toLowerCase();

// Finds products by name, brand, SKU or barcode. Never returns cost. Brand partners only find their own brand.
export const searchProducts = (query: string, limit = 8) =>
  respond((): ProductHit[] => {
    const needle = normalize(query);
    if (!needle) return [];
    const me = actor();
    const brandName = (brandId: Id) => db.brands.find((brand) => brand.id === brandId)?.name ?? '';
    const hits: ProductHit[] = [];
    for (const product of db.products) {
      if (product.archived || (me.brandId && product.brandId !== me.brandId)) continue;
      const variant = product.variants.find((current) => !current.archived && (current.barcode === needle || normalize(current.sku) === needle || normalize(current.sku).includes(needle)));
      const matchesName = normalize(product.name).includes(needle) || normalize(brandName(product.brandId)).includes(needle);
      if (!variant && !matchesName) continue;
      hits.push({
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        brandName: brandName(product.brandId),
        photo: product.photo,
        detail: variant ? `${variant.size} · ${variant.color} · ${variant.sku}` : brandName(product.brandId),
      });
      if (hits.length >= limit) break;
    }
    return hits;
  });
