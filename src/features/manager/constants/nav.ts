import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The branch manager's side menu, in order.
export const managerNav: NavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', to: routes.manager.dashboard, icon: 'dashboard', end: true },
      { key: 'reports', to: routes.manager.reports, icon: 'chart' },
    ],
  },
  {
    key: 'stock',
    items: [
      { key: 'stock', to: routes.manager.stock, icon: 'layers' },
      { key: 'transfers', to: routes.manager.transfers, icon: 'truck' },
      { key: 'counts', to: routes.manager.counts, icon: 'barcode' },
      { key: 'defects', to: routes.manager.defects, icon: 'warning' },
    ],
  },
  {
    key: 'branch',
    items: [
      { key: 'approvals', to: routes.manager.approvals, icon: 'checkCircle' },
      { key: 'registers', to: routes.manager.registers, icon: 'wallet' },
      { key: 'staff', to: routes.manager.staff, icon: 'users' },
    ],
  },
];
