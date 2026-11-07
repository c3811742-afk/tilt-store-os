import type { BranchStockLevelsProps } from './BranchStockLevels.types';

export const branchStockLevelsDefaults: Required<Pick<BranchStockLevelsProps, 'status' | 'limit'>> = {
  status: '',
  limit: 150,
};
