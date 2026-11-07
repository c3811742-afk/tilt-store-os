import { vars } from '@/shared/theme';
import type { NotificationListProps } from './NotificationList.types';

export const notificationListDefaults: Required<Pick<NotificationListProps, 'items' | 'gap'>> = {
  items: [],
  gap: vars.spacing[2],
};
