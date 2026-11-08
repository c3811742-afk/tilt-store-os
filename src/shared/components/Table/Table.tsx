import { cx, withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { tableDefaults } from './Table.defaults';
import type { TableColumn, TableProps } from './Table.types';
import styles from './Table.module.css';

const alignClass = (align: TableColumn['align']) => cx(align === 'end' && styles.end, align === 'center' && styles.center);

// A data table that scrolls sideways on its own when it is wider than the screen, so the page never does.
// Phones show each row as a card (stackOnMobile, on by default).
export const Table = (props: TableProps) => {
  const { columns, rows, label, emptyText, sort, onSortChange, footer, stackOnMobile } = withDefaults(tableDefaults, props);

  const header = (column: TableColumn) => {
    if (!column.sortable || !onSortChange) return column.label;
    const active = sort?.key === column.key;
    const next = active && sort?.direction === 'desc' ? 'asc' : 'desc';
    return (
      <button type="button" className={styles.sortButton} onClick={() => onSortChange({ key: column.key, direction: next })}>
        {column.label}
        {active && <Icon name={sort?.direction === 'desc' ? 'chevronDown' : 'chevronUp'} />}
      </button>
    );
  };

  return (
    <div className={styles.scroller} data-table>
      <table className={cx(styles.table, stackOnMobile && styles.stacked)} aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={alignClass(column.align)}
                aria-sort={sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {header(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyText ? (
            <tr>
              <td colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className={cx(row.onClick && styles.clickable)} onClick={row.onClick}>
                {columns.map((column) => (
                  <td key={column.key} className={alignClass(column.align)} data-label={typeof column.label === 'string' ? column.label : undefined}>
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && rows.length > 0 && (
          <tfoot>
            <tr>
              {columns.map((column) => (
                <td key={column.key} className={alignClass(column.align)}>
                  {footer[column.key]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
