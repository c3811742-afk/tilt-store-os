import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The owner's side menu, in order.
export const ownerNav: NavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', to: routes.owner.dashboard, icon: 'dashboard', end: true },
      { key: 'morning', to: routes.owner.morning, icon: 'sun' },
      { key: 'reports', to: routes.owner.reports, icon: 'chart' },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'brands', to: routes.owner.brands, icon: 'tag' },
      { key: 'products', to: routes.owner.products, icon: 'box' },
      { key: 'categories', to: routes.owner.categories, icon: 'layers' },
      { key: 'promotions', to: routes.owner.promotions, icon: 'percent' },
    ],
  },
  {
    key: 'stock',
    items: [
      { key: 'stock', to: routes.owner.stock, icon: 'layers' },
      { key: 'transfers', to: routes.owner.transfers, icon: 'truck' },
      { key: 'costing', to: routes.owner.costing, icon: 'calculator' },
      { key: 'defects', to: routes.owner.defects, icon: 'warning' },
    ],
  },
  {
    key: 'money',
    items: [
      { key: 'payouts', to: routes.owner.payouts, icon: 'wallet' },
      { key: 'expenses', to: routes.owner.expenses, icon: 'card' },
    ],
  },
  {
    key: 'control',
    items: [
      { key: 'approvals', to: routes.owner.approvals, icon: 'checkCircle' },
      { key: 'activity', to: routes.owner.activity, icon: 'activity' },
      { key: 'customers', to: routes.owner.customers, icon: 'user' },
    ],
  },
  {
    key: 'setup',
    items: [
      { key: 'branches', to: routes.owner.branches, icon: 'store' },
      { key: 'currencies', to: routes.owner.currencies, icon: 'coins' },
      { key: 'tax', to: routes.owner.tax, icon: 'receipt' },
      { key: 'staff', to: routes.owner.staff, icon: 'users' },
      { key: 'roles', to: routes.owner.roles, icon: 'shield' },
      { key: 'policies', to: routes.owner.policies, icon: 'shield' },
      { key: 'settings', to: routes.owner.settings, icon: 'settings' },
    ],
  },
];
