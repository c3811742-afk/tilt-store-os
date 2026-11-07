import type { NotificationView } from '@/shared/api';

export interface NotificationListProps {
  items?: NotificationView[];
  gap?: string; // space between the alerts
  onError?: (error: unknown) => void; // a failed "mark as read"; the page shows the message
}
