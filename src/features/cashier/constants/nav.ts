import type { NavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The counter's side menu, in order. Branch managers also see the requests sent to their phone.
export const cashierNav: NavGroup[] = [
  {
    key: 'counter',
    items: [
      { key: 'sell', to: routes.cashier.sell, icon: 'barcode', end: true },
      { key: 'held', to: routes.cashier.held, icon: 'pause' },
      { key: 'returns', to: routes.cashier.returns, icon: 'swap' },
      { key: 'receipts', to: routes.cashier.receipts, icon: 'receipt' },
      { key: 'stock', to: routes.cashier.stock, icon: 'layers' },
      { key: 'customers', to: routes.cashier.customers, icon: 'user' },
      { key: 'shift', to: routes.cashier.shift, icon: 'clock' },
      { key: 'mySales', to: routes.cashier.mySales, icon: 'chart' },
    ],
  },
];

export const managerNav: NavGroup[] = [{ key: 'counter', items: [{ key: 'tillApprovals', to: routes.cashier.approvals, icon: 'checkCircle' }] }];
