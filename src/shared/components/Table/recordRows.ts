import type { ReactNode } from 'react';
import type { TableColumn, TableRow } from './Table.types';

// A column that knows how to show one record (e.g. a brand's name, a payout's status).
export interface RecordColumn<T> extends TableColumn {
  render: (record: T) => ReactNode;
}

// Table rows for a list of records: one cell per column, from each column's render.
export const recordRows = <T>(
  records: T[],
  getKey: (record: T) => string,
  columns: RecordColumn<T>[],
  onRowClick?: (record: T) => void,
): TableRow[] =>
  records.map((record) => ({
    key: getKey(record),
    cells: Object.fromEntries(columns.map((column) => [column.key, column.render(record)])),
    onClick: onRowClick ? () => onRowClick(record) : undefined,
  }));
