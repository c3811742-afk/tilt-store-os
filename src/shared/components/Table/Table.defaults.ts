import type { TableProps } from './Table.types';

export const tableDefaults: Required<Pick<TableProps, 'columns' | 'rows' | 'stackOnMobile'>> = {
  columns: [],
  rows: [],
  stackOnMobile: true,
};
