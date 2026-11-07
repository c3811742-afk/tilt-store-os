import type { CountView } from '@/shared/api';

export interface CountCardsProps {
  views?: CountView[];
  pathFor?: (countId: string) => string; // each card links to the count
}
