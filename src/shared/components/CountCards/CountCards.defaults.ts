import type { StockCount } from '@/shared/types';
import type { BadgeVariant } from '../Badge';
import type { CountCardsProps } from './CountCards.types';

export const countCardsDefaults: Required<Pick<CountCardsProps, 'views'>> = {
  views: [],
};

// Counting and waiting are open work (warning), the end states are quiet.
export const countStateTone: Record<StockCount['status'], BadgeVariant> = {
  open: 'info',
  pending: 'warning',
  approved: 'success',
  rejected: 'neutral',
};
