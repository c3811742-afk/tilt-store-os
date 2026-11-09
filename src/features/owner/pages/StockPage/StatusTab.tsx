import { getStockByStatus, type StockFilter } from '@/shared/api';
import { AsyncContent, Badge, Table } from '@/shared/components';
import { stockStatusTone } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';

// Pieces in each status, per branch: available, reserved, in transit, waiting for inspection, defective...
export const StatusTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getStockByStatus(filter), [JSON.stringify(filter), version]);
  const table = useTableSort(); // the statuses in their usual order until a heading is clicked
  const t = text.owner.stock;
  return (
    <AsyncContent state={state}>
      {(data) => (
        <Table
          label={t.tabs.status}
          sort={table.sort}
          onSortChange={table.setSort}
          columns={[
            { key: 'status', label: text.common.status, sortable: true },
            ...data.branchIds.map((id) => ({ key: id, label: format.branch(id), align: 'end' as const, sortable: true })),
            { key: 'total', label: text.common.total, align: 'end', sortable: true },
          ]}
          rows={table
            .sorted(data.rows, (row, key) => (key === 'status' ? t.statuses[row.status] : key === 'total' ? row.total : (row.byBranch[key] ?? 0)))
            .map((row) => ({
              key: row.status,
              cells: {
                status: <Badge variant={stockStatusTone[row.status]}>{t.statuses[row.status]}</Badge>,
                ...Object.fromEntries(data.branchIds.map((id) => [id, format.number(row.byBranch[id] ?? 0)])),
                total: format.number(row.total),
              },
            }))}
        />
      )}
    </AsyncContent>
  );
};
