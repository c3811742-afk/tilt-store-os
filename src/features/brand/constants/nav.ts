import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The brand partner's menu.
export const brandNav: NavGroup[] = [
  {
    key: 'brandPortal',
    items: [
      { key: 'brandOverview', to: routes.brand.home, icon: 'dashboard', end: true },
      { key: 'brandSales', to: routes.brand.sales, icon: 'chart' },
      { key: 'stock', to: routes.brand.stock, icon: 'layers' },
      { key: 'returnsDefects', to: routes.brand.returns, icon: 'swap' },
      { key: 'promotions', to: routes.brand.promotions, icon: 'percent' },
    ],
  },
];
