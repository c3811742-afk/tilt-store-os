import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The online orders staff's side menu.
export const onlineNav: NavGroup[] = [
  {
    key: 'online',
    items: [
      { key: 'orders', to: routes.online.orders, icon: 'receipt', end: true },
      { key: 'onlineStock', to: routes.online.stock, icon: 'layers' },
    ],
  },
];
