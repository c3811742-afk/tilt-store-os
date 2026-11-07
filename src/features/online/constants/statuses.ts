import type { BadgeVariant } from '@/shared/components';
import type { OnlineOrderStatus } from '@/shared/types';

// The badge color of each step of an online order: waiting on the staff (warning), moving (info), done.
export const orderStatusTone: Record<OnlineOrderStatus, BadgeVariant> = {
  new: 'warning',
  packed: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'neutral',
  returned: 'neutral',
};

export const orderSteps: readonly OnlineOrderStatus[] = ['new', 'packed', 'shipped', 'delivered'];
