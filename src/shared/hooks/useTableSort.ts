import { useState } from 'react';
import type { TableSort } from '@/shared/components';

type SortValue = string | number | null | undefined;

// Sorting a table by clicking a column heading (again to turn it round). Until a heading is clicked, the rows open on
// `initial` (e.g. best sellers first) and its arrow shows on that heading. `sorted` orders any rows by the raw value
// each column holds, numbers as numbers and words in the active language's order.
export const useTableSort = (initial?: TableSort) => {
  const [chosen, setSort] = useState<TableSort | null>(null);
  const sort = chosen ?? initial;
  const sorted = <T,>(rows: readonly T[], valueOf: (row: T, key: string) => SortValue): T[] => {
    if (!sort) return [...rows];
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = valueOf(a, sort.key);
      const y = valueOf(b, sort.key);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
      return String(x ?? '').localeCompare(String(y ?? '')) * factor;
    });
  };
  return { sort, setSort, reset: () => setSort(null), sorted };
};
