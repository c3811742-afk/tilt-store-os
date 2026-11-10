import type { NotificationView } from '@/shared/api';

export interface NotificationListProps {
  items?: NotificationView[];
  gap?: string; // space above and below each alert; alerts are separated by a thin line
  onError?: (error: unknown) => void; // a failed dismiss; the page shows the message
  pageSize?: number; // alerts (or groups of one kind) shown before See more
  swipeThreshold?: number; // share of the row's width (0 to 1) a swipe must cross to dismiss it
}
