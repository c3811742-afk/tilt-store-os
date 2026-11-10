import { Link } from 'react-router';
import { getStockAging, type StockFilter } from '@/shared/api';
import { AsyncContent, Grid, Stack, StatCard, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';


// How long items have stayed unsold, grouped by the age limits in Policies. Opens with the oldest first.
export const AgingTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getStockAging(filter), [JSON.stringify(filter), version]);
  const table = useTableSort({ key: 'days', direction: 'desc' });
  const t = text.owner.stock;
  return (
    <AsyncContent state={state}>
      {(data) => {
        const rows = table.sorted(data.rows, (row, key) =>
          key === 'item' ? `${row.productName} ${row.size} ${row.color}` : key === 'branch' ? format.branch(row.branchId) : key === 'qty' ? row.qty : key === 'lastSale' ? (row.daysSinceSale ?? Number.MAX_SAFE_INTEGER) : row.days,
        );
        return (
          <Stack gap={vars.spacing[4]}>
            <Grid>
              {data.summary.map((bucket) => (
                <StatCard key={bucket.index} label={bucket.to === null ? fillText(t.olderThan, { days: format.number(bucket.from - 1) }) : fillText(t.daysRange, { from: format.number(bucket.from), to: format.number(bucket.to) })} value={fillText(text.owner.dashboard.units, { count: format.number(bucket.pieces) })} highlight={bucket.to === null} />
              ))}
            </Grid>
            <Table paged filterable={false}
              label={t.tabs.aging}
              sort={table.sort}
              onSortChange={table.setSort}
              columns={[
                { key: 'item', label: text.owner.fields.product, sortable: true },
                { key: 'branch', label: text.owner.fields.branch, sortable: true },
                { key: 'qty', label: t.pieces, align: 'end', sortable: true },
                { key: 'days', label: t.daysInStock, align: 'end', sortable: true },
                { key: 'lastSale', label: t.lastSale, align: 'end', sortable: true },
              ]}
              rows={rows.map((row) => ({
                key: `${row.variantId}|${row.branchId}`,
                cells: {
                  item: <Link to={toPath(routes.owner.itemHistory, { variantId: row.variantId })}>{`${row.productName} · ${row.size} · ${row.color}`}</Link>,
                  branch: format.branch(row.branchId),
                  qty: format.number(row.qty),
                  days: format.number(row.days),
                  lastSale: row.daysSinceSale === null ? t.neverSold : fillText(t.daysAgo, { days: format.number(row.daysSinceSale) }),
                },
              }))}
            />
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
