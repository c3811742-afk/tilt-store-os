import type { BranchCountsProps } from './BranchCounts.types';

export const branchCountsDefaults: Required<Pick<BranchCountsProps, 'allowBlind' | 'initialTab'>> = {
  allowBlind: false,
  initialTab: 'open',
};
