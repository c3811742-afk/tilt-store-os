import type { StockFilter } from '@/shared/api';

// Whether any filter narrows the stock views, so an empty list says "no results" instead of "nothing yet".
export const isFiltered = (filter: StockFilter) => Object.values(filter).some(Boolean);
