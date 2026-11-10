import { Link } from 'react-router';
import { getStockLevels, type StockFilter, type StockRow } from '@/shared/api';
import { AsyncContent, Notice, Stack, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';
import { vars } from '@/shared/theme';


// Pieces on hand of each item in each branch. Opens with the most pieces first; every column sorts.
export const LevelsTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getStockLevels(filter), [JSON.stringify(filter), version]);
  const table = useTableSort({ key: 'total', direction: 'desc' });
  const t = text.owner.stock;
  const valueOf = (row: StockRow, key: string) => (key === 'item' ? row.productName : key === 'variant' ? `${row.size} ${row.color}` : key === 'total' ? row.total : (row.byBranch[key] ?? 0));

  return (
    <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
      {(data) => {
        const rows = table.sorted(data.rows, valueOf);
        return (
          <Stack gap={vars.spacing[2]}>
            <Table paged filterable={false}
              label={t.tabs.levels}
              sort={table.sort}
              onSortChange={table.setSort}
              columns={[
                { key: 'item', label: text.owner.fields.product, sortable: true },
                { key: 'variant', label: text.owner.fields.variant, sortable: true },
                ...data.branchIds.map((id) => ({ key: id, label: format.branch(id), align: 'end' as const, sortable: true })),
                { key: 'total', label: text.common.total, align: 'end', sortable: true },
              ]}
              rows={rows.map((row) => ({
                key: row.variantId,
                cells: {
                  item: (
                    <Stack gap={vars.spacing[0]}>
                      <Link to={toPath(routes.owner.product, { productId: row.productId })}>{row.productName}</Link>
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {format.brand(row.brandId)}
                      </Text>
                    </Stack>
                  ),
                  variant: <Link to={toPath(routes.owner.itemHistory, { variantId: row.variantId })}>{`${row.size} · ${row.color}`}</Link>,
                  ...Object.fromEntries(data.branchIds.map((id) => [id, format.number(row.byBranch[id] ?? 0)])),
                  total: format.number(row.total),
                },
              }))}
              footer={Object.fromEntries([
                ['item', text.common.total],
                ...data.branchIds.map((id) => [id, format.number(data.rows.reduce((sum, row) => sum + (row.byBranch[id] ?? 0), 0))]),
                ['total', format.number(data.rows.reduce((sum, row) => sum + row.total, 0))],
              ])}
            />
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
