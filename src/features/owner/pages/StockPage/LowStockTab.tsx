import { Link } from 'react-router';
import { getLowStock, type StockFilter } from '@/shared/api';
import { AsyncContent, Badge, Notice, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';
import { isFiltered } from './isFiltered';

const rowLimit = 300;

// Items at or below their minimum in each store. Opens with the fewest pieces (out of stock) first.
export const LowStockTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getLowStock(filter), [JSON.stringify(filter), version]);
  const table = useTableSort({ key: 'qty', direction: 'asc' });
  const t = text.owner.stock;
  return (
    <AsyncContent state={state} empty={isFiltered(filter) ? <Notice>{text.common.noResults}</Notice> : <Notice tone="success">{t.noLowStock}</Notice>}>
      {(rows) => (
        <Table
          label={t.tabs.low}
          sort={table.sort}
          onSortChange={table.setSort}
          columns={[
            { key: 'item', label: text.owner.fields.product, sortable: true },
            { key: 'branch', label: text.owner.fields.branch, sortable: true },
            { key: 'qty', label: t.available, align: 'end', sortable: true },
            { key: 'min', label: t.minimum, align: 'end', sortable: true },
          ]}
          rows={table
            .sorted(rows, (row, key) => (key === 'item' ? `${row.productName} ${row.size} ${row.color}` : key === 'branch' ? format.branch(row.branchId) : key === 'min' ? row.min : row.qty))
            .slice(0, rowLimit)
            .map((row) => ({
              key: `${row.variantId}|${row.branchId}`,
              cells: {
                item: <Link to={toPath(routes.owner.itemHistory, { variantId: row.variantId })}>{`${row.productName} · ${row.size} · ${row.color}`}</Link>,
                branch: format.branch(row.branchId),
                qty: row.qty <= 0 ? <Badge variant="danger">{t.outOfStock}</Badge> : format.number(row.qty),
                min: format.number(row.min),
              },
            }))}
        />
      )}
    </AsyncContent>
  );
};
