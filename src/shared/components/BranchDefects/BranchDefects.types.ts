import type { DefectFoundAt } from '@/shared/types';

export interface BranchDefectsProps {
  foundAtOptions?: DefectFoundAt[]; // where a reported defect can have been found
  showLiability?: boolean; // record and show who carries the cost (storekeepers)
  showPhotos?: boolean; // allow photos when reporting (storekeepers)
}
