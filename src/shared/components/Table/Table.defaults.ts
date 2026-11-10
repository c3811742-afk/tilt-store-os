import type { TableProps } from './Table.types';

export const tableDefaults: Required<Pick<TableProps, 'columns' | 'rows' | 'stackOnMobile' | 'filterable' | 'filterFromRows' | 'filterChoicesMax' | 'paged' | 'pageSize'>> = {
  columns: [],
  rows: [],
  stackOnMobile: true,
  filterable: true,
  filterFromRows: 6,
  filterChoicesMax: 20,
  paged: false,
  pageSize: 10,
};
