import { getBrandUnits } from '@/shared/api';
import { AsyncContent, Card, ColumnChart, FilterToolbar, Grid, PageHeader, PeriodFilter, SelectField, Stack, StatCard, Table, filterField, useTableFilters } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, usePeriod, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// Units sold of the brand's products by branch and date.
export const SalesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const { branches } = useReference();
  const period = usePeriod('month');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const t = text.brandPortal.sales;
  const columnFilters = useTableFilters();
  const state = useAsync(() => getBrandUnits(period.range, branchId || undefined), [period.range.from, period.range.to, branchId, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <FilterToolbar
        leading={<PeriodFilter period={period} />}
        fields={[
          filterField('branch', <SelectField label={t.branch} placeholder={t.allBranches} value={branchId} onChange={setBranchId} options={branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse').map((branch) => ({ value: branch.id, label: branch.name }))} />, {
            label: t.branch,
            value: branchId && format.branch(branchId),
            clear: () => setBranchId(''),
          }),
        ]}
        table={columnFilters}
      />
      <AsyncContent state={state}>
        {(data) => (
          <Stack gap={vars.spacing[5]}>
            <Grid minColumnWidth={vars.sizes.card.minWidth}>
              <StatCard label={t.sold} value={format.number(data.sold)} highlight />
              <StatCard label={t.returned} value={format.number(data.returned)} />
            </Grid>
            {/* The chart next to the branches, the products below at full width. */}
            <Grid minColumnWidth={vars.sizes.card.minWidth}>
              <Card title={t.byDay}>
                <ColumnChart label={t.byDay} points={data.byDay.map((point) => ({ key: point.day, label: format.shortDate(`${point.day}T12:00:00`), value: point.sold, display: format.number(point.sold) }))} labelEvery={Math.max(1, Math.ceil(data.byDay.length / 10))} />
              </Card>
              <Card title={t.byBranch}>
                <Table paged filterable={false} // the Branch filter
                  label={t.byBranch}
                  columns={[
                    { key: 'branch', label: t.branch },
                    { key: 'sold', label: t.sold, align: 'end' },
                    { key: 'returned', label: t.returned, align: 'end' },
                  ]}
                  rows={data.byBranch.map((row) => ({ key: row.branchId, cells: { branch: row.name, sold: format.number(row.sold), returned: format.number(row.returned) } }))}
                  footer={{ branch: text.common.total, sold: format.number(data.sold), returned: format.number(data.returned) }}
                />
              </Card>
            </Grid>
            <Card title={t.byProduct}>
              <Table paged
                filters={columnFilters}
                label={t.byProduct}
                emptyText={text.brandPortal.overview.noSales}
                columns={[
                  { key: 'product', label: t.product },
                  { key: 'sold', label: t.sold, align: 'end' },
                  { key: 'returned', label: t.returned, align: 'end' },
                ]}
                rows={data.byProduct.map((row) => ({ key: row.productId, cells: { product: row.name, sold: format.number(row.sold), returned: format.number(row.returned) } }))}
              />
            </Card>
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
