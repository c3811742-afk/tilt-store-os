import type { NotificationView } from '@/shared/api';

export interface NotificationListProps {
  items?: NotificationView[];
  gap?: string; // space above and below each alert; alerts are separated by a thin line
  onError?: (error: unknown) => void; // a failed "mark as read"; the page shows the message
}
