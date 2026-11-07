import type { StockStatus } from '@/shared/types';

export interface BranchStockLevelsProps {
  itemPath?: (variantId: string) => string; // a row opens this page (the item's history)
  status?: StockStatus | ''; // start filtered on a status
  limit?: number; // rows shown before asking to narrow the search
}
