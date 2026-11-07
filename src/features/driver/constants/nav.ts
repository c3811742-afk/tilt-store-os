import type { AppShellNavGroup } from '@/shared/components';
import { routes } from '@/shared/constants';

// The driver's side menu.
export const driverNav: AppShellNavGroup[] = [
  { key: 'work', items: [{ key: 'jobs', to: routes.driver.jobs, icon: 'truck', end: true }] },
];
