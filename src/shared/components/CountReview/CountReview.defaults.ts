import type { CountReviewProps } from './CountReview.types';

export const countReviewDefaults: Required<Pick<CountReviewProps, 'canDecide'>> = {
  canDecide: false,
};
