import type { TransferStage } from '@/shared/api';
import type { BadgeVariant } from '../Badge';
import type { TransferCardsProps } from './TransferCards.types';

export const transferCardsDefaults: Required<Pick<TransferCardsProps, 'views'>> = {
  views: [],
};

// The badge color of each step: waiting on someone (warning), moving (info), done (success).
export const transferStageTone: Record<TransferStage, BadgeVariant> = {
  requested: 'warning',
  approved: 'info',
  pickedUp: 'info',
  delivered: 'warning',
  received: 'success',
  rejected: 'neutral',
  cancelled: 'neutral',
};
