import type { BranchSelectProps } from './ReferenceSelect.types';

// By default every branch that sells (stores and the online store), not archived ones.
export const branchSelectDefaults: Required<Pick<BranchSelectProps, 'kinds' | 'includeArchived'>> = {
  kinds: ['store', 'online'],
  includeArchived: false,
};
