import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The IT admin's own menu, shown above every owner screen.
export const itNav: NavGroup[] = [
  {
    key: 'system',
    items: [
      { key: 'data', to: routes.it.data, icon: 'layers', end: true },
      { key: 'errors', to: routes.it.errors, icon: 'warning' },
      { key: 'backups', to: routes.it.backups, icon: 'download' },
    ],
  },
];
