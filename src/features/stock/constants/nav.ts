import type { AppShellNavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The storekeeper's side menu, in order.
export const storekeeperNav: AppShellNavGroup[] = [
  {
    key: 'work',
    items: [
      { key: 'today', to: routes.storekeeper.home, icon: 'dashboard', end: true },
      { key: 'receiving', to: routes.storekeeper.receiving, icon: 'box' },
      { key: 'inspection', to: routes.storekeeper.defects, icon: 'warning' },
      { key: 'transfers', to: routes.storekeeper.transfers, icon: 'truck' },
      { key: 'brandReturns', to: routes.storekeeper.brandReturns, icon: 'swap' },
    ],
  },
  {
    key: 'stock',
    items: [
      { key: 'stock', to: routes.storekeeper.stock, icon: 'layers' },
      { key: 'counts', to: routes.storekeeper.counts, icon: 'barcode' },
    ],
  },
];
