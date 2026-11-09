import type { ReactNode } from 'react';

export interface TableColumn {
  key: string;
  label: ReactNode;
  align?: 'start' | 'end' | 'center';
  sortable?: boolean; // the header becomes a button that sorts by this column
  width?: string; // a fixed width (e.g. a column of quantity boxes); other columns share the rest
  wrap?: boolean; // in a one-line table (nowrap), this column's text may still wrap (e.g. a list of items)
}

export interface TableRow {
  key: string;
  cells: Record<string, ReactNode>; // one cell per column key
  onClick?: () => void; // the whole row opens something (e.g. a product)
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
}
