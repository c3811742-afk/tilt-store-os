import type { ReactNode } from 'react';
import type { TableFilterController } from './useTableFilters';

export interface TableColumn {
  key: string;
  label: ReactNode;
  align?: 'start' | 'end' | 'center';
  sortable?: boolean; // the header becomes a button that sorts by this column
  width?: string; // a fixed width (e.g. a column of quantity boxes); other columns share the rest
  wrap?: boolean; // in a one-line table (nowrap), this column's text may still wrap (e.g. a list of items)
  filterable?: boolean; // false leaves this column out of the table's filters (on by default for every column)
}

export interface TableRow {
  key: string;
  cells: Record<string, ReactNode>; // one cell per column key
  onClick?: () => void; // the whole row opens something (e.g. a product)
  values?: Record<string, string | number>; // what a cell is filtered by, when it isn't the text it shows
}

// One column's filter: a value to match, words it contains, or a range for a number column.
export interface TableFilterValue {
  choice?: string;
  text?: string;
  min?: string;
  max?: string;
}

export interface TableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TableProps {
  columns?: TableColumn[];
  rows?: TableRow[];
  label?: string; // accessible name of the table
  emptyText?: ReactNode; // shown when there are no rows
  sort?: TableSort; // the current sort, shown on the header
  onSortChange?: (sort: TableSort) => void;
  footer?: Record<string, ReactNode>; // a totals row, one cell per column key
  stackOnMobile?: boolean; // on phones each row becomes a card, each cell with its column name
  nowrap?: boolean; // every row stays on one line and the table scrolls sideways (wide tables with many columns)
  filterable?: boolean; // a Filters button over the table filters it by any of its columns (off for forms)
  filterFromRows?: number; // the Filters button shows from this many rows (a short list needs none)
  filterChoicesMax?: number; // a column with up to this many different values is filtered by picking one; more, by typing
  filters?: TableFilterController; // the page holds the column filters, in its own Filters panel (useTableFilters)
  paged?: boolean; // show the rows a page at a time (dashboards and reports)
  pageSize?: number; // rows per page when paged
}
