import { vars } from '@/shared/theme';
import type { NotificationListProps } from './NotificationList.types';

export const notificationListDefaults: Required<Pick<NotificationListProps, 'items' | 'gap' | 'pageSize' | 'swipeThreshold'>> = {
  items: [],
  gap: vars.spacing[2],
  pageSize: 10,
  swipeThreshold: 0.35,
};
