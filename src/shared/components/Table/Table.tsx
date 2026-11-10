import { useEffect, useState } from 'react';
import { useLocale } from '@/shared/hooks';
import { cx, fillText, formatNumber, withDefaults } from '@/shared/utils';
import { FilterToolbar } from '../FilterToolbar';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { tableDefaults } from './Table.defaults';
import type { TableColumn, TableProps } from './Table.types';
import { isFilterSet, passesFilters, tableFilterDefs } from './tableFilters';
import { useTableFilters } from './useTableFilters';
import styles from './Table.module.css';

const alignClass = (align: TableColumn['align']) => cx(align === 'end' && styles.end, align === 'center' && styles.center);
const cellClass = (column: TableColumn) => cx(alignClass(column.align), column.wrap && styles.wrap);

// A data table that scrolls sideways on its own when it is wider than the screen, so the page never does.
// Phones show each row as a card (stackOnMobile, on by default). A longer table has a Filters button for any of its
// columns, with the filters in use as chips (as admin products do), and a paged one shows a page of rows at a time.
export const Table = (props: TableProps) => {
  const { columns, rows, label, emptyText, sort, onSortChange, footer, stackOnMobile, nowrap, filterable, filterFromRows, filterChoicesMax, filters, paged, pageSize } = withDefaults(tableDefaults, props);
  const { text, locale } = useLocale();
  const own = useTableFilters();
  const control = filters ?? own;
  const [paging, setPaging] = useState({ key: '', page: 0 });

  // The filters this table offers: from any number of rows when the page holds them, from a longer list otherwise.
  const defs = filterable && (filters || rows.length >= filterFromRows) ? tableFilterDefs(columns, rows, filterChoicesMax) : [];
  const signature = JSON.stringify(defs);
  useEffect(() => {
    control.setDefs(JSON.parse(signature) as typeof defs);
    // Only when the filters themselves change (the setter is new on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const active = defs.filter((def) => isFilterSet(control.values[def.key]));
  const shown = active.length ? rows.filter((row) => passesFilters(row, defs, control.values)) : rows;
  // Back to the first page whenever the filters or the sort change.
  const pagingKey = JSON.stringify([control.values, sort]);
  const page = paging.key === pagingKey ? paging.page : 0;
  const setPage = (next: number) => setPaging({ key: pagingKey, page: next });
  const pages = paged ? Math.max(1, Math.ceil(shown.length / pageSize)) : 1;
  const current = Math.min(page, pages - 1);
  const visible = paged ? shown.slice(current * pageSize, (current + 1) * pageSize) : shown;
  const number = (value: number) => formatNumber(value, locale);
  const sortBy = (next: Parameters<NonNullable<typeof onSortChange>>[0]) => onSortChange?.(next);

  const header = (column: TableColumn) => {
    if (!column.sortable || !onSortChange) return column.label;
    const sorted = sort?.key === column.key;
    const next = sorted && sort?.direction === 'desc' ? 'asc' : 'desc';
    return (
      <button type="button" className={styles.sortButton} onClick={() => sortBy({ key: column.key, direction: next })}>
        {column.label}
        {sorted && <Icon name={sort?.direction === 'desc' ? 'chevronDown' : 'chevronUp'} />}
      </button>
    );
  };

  const table = (
    <div className={styles.scroller} data-table>
      <table className={cx(styles.table, stackOnMobile && styles.stacked, nowrap && styles.nowrap)} aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={alignClass(column.align)}
                style={column.width ? { inlineSize: column.width } : undefined}
                aria-sort={sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {header(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (emptyText || active.length > 0) ? (
            <tr>
              <td colSpan={columns.length}>{active.length ? text.common.noResults : emptyText}</td>
            </tr>
          ) : (
            visible.map((row) => (
              <tr key={row.key} className={cx(row.onClick && styles.clickable)} onClick={row.onClick}>
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)} data-label={typeof column.label === 'string' ? column.label : undefined}>
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {/* Totals are for every row, so they hide while filters leave some out. */}
        {footer && visible.length > 0 && !active.length && (
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

  const pager = paged && shown.length > pageSize && (
    <div className={styles.pager}>
      <span>{fillText(text.common.pageRange, { from: number(current * pageSize + 1), to: number(current * pageSize + visible.length), total: number(shown.length) })}</span>
      <IconButton icon="chevronStart" label={text.common.previousPage} disabled={current === 0} onClick={() => setPage(current - 1)} />
      <IconButton icon="chevronEnd" label={text.common.nextPage} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} />
    </div>
  );

  // The table's own Filters (when the page doesn't hold them) look the same as a page's.
  const toolbar = !filters && defs.length > 0 && <FilterToolbar table={own} />;
  if (!toolbar && !pager) return table;

  return (
    <div className={styles.group} data-table-group>
      {toolbar}
      {table}
      {pager}
    </div>
  );
};
