import type { Brand, BrandTerms, Id, IsoDate, StoredFile } from '@/shared/types';
import { currentTerms, nowIso, toIsoDate } from '@/shared/utils';
import { ApiError } from './errors';
import { actor, db, diff, findById, logActivity, mutate, newId, respond } from './server';

export interface BrandRow {
  brand: Brand;
  terms: BrandTerms;
  productCount: number;
  activeProductCount: number;
}

const productCounts = (brandId: Id) => {
  const products = db.products.filter((product) => product.brandId === brandId);
  return { productCount: products.length, activeProductCount: products.filter((product) => !product.archived).length };
};

export const listBrands = () =>
  respond((): BrandRow[] =>
    db.brands.map((brand) => ({ brand, terms: currentTerms(brand), ...productCounts(brand.id) })).sort((a, b) => a.brand.name.localeCompare(b.brand.name)),
  );

export const getBrand = (brandId: Id) =>
  respond(() => {
    const brand = findById(db.brands, brandId);
    return { brand, terms: currentTerms(brand), ...productCounts(brand.id), lockedUntil: lockedUntil(brandId) };
  });

export type BrandProfile = Pick<Brand, 'name' | 'logo' | 'instagram' | 'contactName' | 'phone' | 'email' | 'payment' | 'contractStart'>;

export const createBrand = (profile: BrandProfile, terms: BrandTerms) =>
  mutate(() => {
    const me = actor();
    const at = nowIso();
    const brand: Brand = {
      id: newId(),
      ...profile,
      status: 'active',
      termsHistory: [{ id: newId(), effectiveFrom: profile.contractStart, terms, byId: me.id, at }],
      createdAt: at,
    };
    db.brands.push(brand);
    logActivity({ action: 'create', target: { type: 'brand', id: brand.id, label: brand.name } });
    return brand;
  });

export const updateBrandProfile = (brandId: Id, profile: BrandProfile) =>
  mutate(() => {
    const brand = findById(db.brands, brandId);
    const before = { ...brand };
    Object.assign(brand, profile);
    logActivity({
      action: 'update',
      target: { type: 'brand', id: brand.id, label: brand.name },
      changes: diff(before, brand, ['name', 'instagram', 'contactName', 'phone', 'email', 'payment', 'contractStart', 'logo']),
    });
    return brand;
  });

// Pausing keeps everything: products, sales, statements. A paused brand's items can't be sold until it's reactivated.
export const setBrandStatus = (brandId: Id, status: Brand['status']) =>
  mutate(() => {
    const brand = findById(db.brands, brandId);
    const from = brand.status;
    brand.status = status;
    logActivity({ action: status === 'paused' ? 'archive' : 'restore', target: { type: 'brand', id: brand.id, label: brand.name }, changes: [{ field: 'status', from, to: status }] });
    return brand;
  });

// The last day of the brand's latest locked statement: terms can't change on or before it.
const lockedUntil = (brandId: Id): IsoDate | null =>
  db.statements
    .filter((statement) => statement.brandId === brandId && statement.locked)
    .map((statement) => statement.periodEnd)
    .sort()
    .at(-1) ?? null;

// New terms from a date. Sales before that date keep the terms they were made under (each sale line keeps its own copy).
export const changeBrandTerms = (brandId: Id, terms: BrandTerms, effectiveFrom: IsoDate, note?: string) =>
  mutate(() => {
    const brand = findById(db.brands, brandId);
    const locked = lockedUntil(brandId);
    if (locked && effectiveFrom <= locked) throw new ApiError('periodLocked');
    const before = currentTerms(brand);
    brand.termsHistory.push({ id: newId(), effectiveFrom, terms, byId: actor().id, at: nowIso(), note });
    logActivity({
      action: 'update',
      target: { type: 'brand', id: brand.id, label: brand.name },
      changes: [
        ...diff(before, terms, Object.keys(terms) as (keyof BrandTerms)[]),
        { field: 'effectiveFrom', from: null, to: effectiveFrom },
      ],
      flagged: before.commissionRate !== terms.commissionRate && effectiveFrom < toIsoDate(),
    });
    return brand;
  });

export const setBrandAgreement = (brandId: Id, file: StoredFile | null) =>
  mutate(() => {
    const brand = findById(db.brands, brandId);
    brand.agreement = file ? { ...file, uploadedAt: nowIso(), byId: actor().id } : undefined;
    logActivity({ action: 'update', target: { type: 'brand', id: brand.id, label: brand.name }, changes: [{ field: 'agreement', from: null, to: file?.name ?? null }] });
    return brand;
  });
