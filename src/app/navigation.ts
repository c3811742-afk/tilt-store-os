import { rolesWithScreens, type ProductHit, type SessionUser } from '@/shared/api';
import type { NavGroup } from '@/shared/components';
import { routes, toPath, withQuery } from '@/shared/constants';
import type { BuiltInRole } from '@/shared/types';
import { ownerNav } from '@/features/owner';
import { managerNav } from '@/features/manager';
import { storekeeperNav } from '@/features/stock';
import { driverNav } from '@/features/driver';
import { onlineNav } from '@/features/online';
import { cashierNav } from '@/features/cashier';
import { itNav } from '@/features/it';
import { brandNav } from '@/features/brand';

// Each kind of role's start page and side menu. A person with several roles gets every menu, in the order of
// rolesWithScreens.

const roleHomes: Partial<Record<BuiltInRole, string>> = {
  owner: routes.owner.dashboard,
  it: routes.it.data,
  manager: routes.manager.dashboard,
  storekeeper: routes.storekeeper.home,
  online: routes.online.orders,
  driver: routes.driver.jobs,
  cashier: routes.cashier.sell,
  brandPartner: routes.brand.home,
};

const roleNavs: Partial<Record<BuiltInRole, NavGroup[]>> = {
  owner: ownerNav,
  it: [...itNav, ...ownerNav],
  manager: [...managerNav, ...cashierNav], // a branch manager can also sell at the counter
  storekeeper: storekeeperNav,
  online: onlineNav,
  driver: driverNav,
  cashier: cashierNav,
  brandPartner: brandNav,
};

const rolesOf = (session: SessionUser) => rolesWithScreens.filter((role) => session.roles.includes(role));

// Where a person lands after signing in. Roles without screens in this demo land on their account page.
export const homeFor = (session: SessionUser) => rolesOf(session).map((role) => roleHomes[role]).find(Boolean) ?? routes.account;

// The side menu: every menu of the person's roles, without repeating a group or a page. When two roles have a page
// with the same name (a manager's and a cashier's "Stock"), the first role's page is kept.
export const navFor = (session: SessionUser): NavGroup[] => {
  const seen = new Set<string>();
  const groups = new Map<string, NavGroup>();
  rolesOf(session)
    .flatMap((role) => roleNavs[role] ?? [])
    .forEach((group) => {
      const items = group.items.filter((item) => !seen.has(item.to) && !seen.has(item.key));
      items.forEach((item) => {
        seen.add(item.to);
        seen.add(item.key);
      });
      if (!items.length) return;
      const existing = groups.get(group.key);
      groups.set(group.key, { key: group.key, items: [...(existing?.items ?? []), ...items] });
    });
  return [...groups.values()];
};

// Where a product found with the search in the top bar opens, for this person.
export const productPathFor = (session: SessionUser, hit: ProductHit) => {
  if (session.isOwner || session.roles.includes('it')) return hit.variantId ? toPath(routes.owner.itemHistory, { variantId: hit.variantId }) : toPath(routes.owner.product, { productId: hit.productId });
  if (session.roles.includes('brandPartner')) return withQuery(routes.brand.stock, { product: hit.productId });
  if (session.permissions.includes('stock.view')) return toPath(routes.cashier.stockItem, { productId: hit.productId });
  return null;
};
