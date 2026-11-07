import type { BranchCountProps } from './BranchCount.types';

export const branchCountDefaults: Required<Pick<BranchCountProps, 'canDecide'>> = {
  canDecide: false,
};
