import { Link } from 'react-router';
import { getStockByStatus, type StockFilter } from '@/shared/api';
import { AsyncContent, Notice, Stack, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';
import { vars } from '@/shared/theme';


// Pieces of each product in each status (available, reserved, in transit, waiting for inspection, defective...),
// one column per status that has pieces. Opens with the products with the most pieces first.
export const StatusTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getStockByStatus(filter), [JSON.stringify(filter), version]);
  const table = useTableSort({ key: 'total', direction: 'desc' });
  const t = text.owner.stock;
  return (
    <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
      {(data) => {
        const rows = table.sorted(data.rows, (row, key) => (key === 'name' ? row.name : key === 'total' ? row.total : (row.byStatus[key as keyof typeof row.byStatus] ?? 0)));
        return (
          <Stack gap={vars.spacing[2]}>
            <Table paged filterable={false}
              label={t.tabs.status}
              sort={table.sort}
              onSortChange={table.setSort}
              columns={[
                { key: 'name', label: text.owner.fields.product, sortable: true },
                ...data.statuses.map((status) => ({ key: status, label: t.statuses[status], align: 'end' as const, sortable: true })),
                { key: 'total', label: text.common.total, align: 'end', sortable: true },
              ]}
              rows={rows.map((row) => ({
                key: row.productId,
                cells: {
                  name: (
                    <Stack gap={vars.spacing[0]}>
                      <Link to={toPath(routes.owner.product, { productId: row.productId })}>{row.name}</Link>
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {format.brand(row.brandId)}
                      </Text>
                    </Stack>
                  ),
                  ...Object.fromEntries(data.statuses.map((status) => [status, format.number(row.byStatus[status] ?? 0)])),
                  total: format.number(row.total),
                },
              }))}
              footer={Object.fromEntries([['name', text.common.total], ...data.statuses.map((status) => [status, format.number(data.totals[status] ?? 0)]), ['total', format.number(data.rows.reduce((sum, row) => sum + row.total, 0))]])}
            />
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
