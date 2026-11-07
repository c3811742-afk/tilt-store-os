import { routes } from '@/shared/constants';
import type { AppLayoutProps } from './AppLayout.types';

export const appLayoutDefaults: Required<Pick<AppLayoutProps, 'nav' | 'notificationsPath' | 'accountItems'>> = {
  nav: [],
  notificationsPath: routes.notifications,
  accountItems: [],
};
