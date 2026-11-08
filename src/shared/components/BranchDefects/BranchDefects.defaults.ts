import type { BranchDefectsProps } from './BranchDefects.types';

export const branchDefectsDefaults: Required<Pick<BranchDefectsProps, 'foundAtOptions' | 'showLiability' | 'showPhotos'>> = {
  foundAtOptions: ['store'],
  showLiability: false,
  showPhotos: false,
};
