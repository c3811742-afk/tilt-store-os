import type { Branch, Brand, Category, Role, Settings } from '@/shared/types';
import { currentTerms } from '@/shared/utils';
import { db, respond } from './server';

export interface ReferenceUser {
  id: string;
  name: string;
  roleIds: string[];
  branchIds: string[];
  status: string;
  photo?: string;
}

export interface ReferenceBrand extends Pick<Brand, 'id' | 'name' | 'status' | 'logo'> {
  model: ReturnType<typeof currentTerms>['model'];
  allowDiscounts: boolean;
}

// The small lists almost every page needs to show names: branches, brands, categories, people, settings.
export interface ReferenceData {
  settings: Settings;
  branches: Branch[];
  brands: ReferenceBrand[];
  categories: Category[];
  roles: Role[];
  users: ReferenceUser[];
}

export const getReferenceData = () =>
  respond(
    (): ReferenceData => ({
      settings: db.settings,
      branches: db.branches,
      brands: db.brands.map((brand) => {
        const terms = currentTerms(brand);
        return { id: brand.id, name: brand.name, status: brand.status, logo: brand.logo, model: terms.model, allowDiscounts: terms.allowDiscounts };
      }),
      categories: db.categories,
      roles: db.roles,
      users: db.users.map(({ id, name, roleIds, branchIds, status, photo }) => ({ id, name, roleIds, branchIds, status, photo })),
    }),
  );
