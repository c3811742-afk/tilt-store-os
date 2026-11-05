import { Link } from 'react-router';
import { getStockAging } from '@/shared/api';
import { AsyncContent, FilterBar, Grid, Stack, StatCard, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { BranchSelect, BrandSelect } from '../../components';

const rowLimit = 200;

// How long items have stayed unsold, oldest first, grouped by the age limits in Policies.
export const AgingTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const version = useLiveVersion();
  const state = useAsync(() => getStockAging({ brandId: brandId || undefined, branchId: branchId || undefined }), [brandId, branchId, version]);
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[4]}>
      <FilterBar>
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        <BranchSelect kinds={['store', 'warehouse']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
      </FilterBar>
      <AsyncContent state={state}>
        {(data) => (
          <Stack gap={vars.spacing[4]}>
            <Grid>
              {data.summary.map((bucket) => (
                <StatCard key={bucket.index} label={bucket.to === null ? fillText(t.olderThan, { days: format.number(bucket.from - 1) }) : fillText(t.daysRange, { from: format.number(bucket.from), to: format.number(bucket.to) })} value={fillText(text.owner.dashboard.units, { count: format.number(bucket.pieces) })} highlight={bucket.to === null} />
              ))}
            </Grid>
            <Table
              label={t.tabs.aging}
              columns={[
                { key: 'item', label: text.owner.fields.product },
                { key: 'branch', label: text.owner.fields.branch },
                { key: 'qty', label: t.pieces, align: 'end' },
                { key: 'days', label: t.daysInStock, align: 'end' },
                { key: 'lastSale', label: t.lastSale, align: 'end' },
              ]}
              rows={data.rows.slice(0, rowLimit).map((row) => ({
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
        )}
      </AsyncContent>
    </Stack>
  );
};
