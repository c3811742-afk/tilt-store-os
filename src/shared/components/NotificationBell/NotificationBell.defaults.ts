import { routes } from '@/shared/constants';
import type { NotificationBellProps } from './NotificationBell.types';

export const notificationBellDefaults: Required<NotificationBellProps> = {
  viewAllPath: routes.notifications,
  latestCount: 6,
};
