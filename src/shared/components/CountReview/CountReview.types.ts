import type { CountView } from '@/shared/api';

export interface CountReviewProps {
  view: CountView; // a submitted or decided count
  canDecide?: boolean; // the branch manager may approve or reject it (within their limit)
}
