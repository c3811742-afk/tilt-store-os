import { getStockValue } from '@/shared/api';
import { AsyncContent, Card, Grid, Stack, StatCard, Table } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BrandSelect, ExportButtons } from '../../components';

// Pieces and their value at cost and at selling price: in total, per branch and per brand.
export const ValueTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const [brandId, setBrandId] = useQueryState('brand', '');
  const version = useLiveVersion();
  const state = useAsync(() => getStockValue({ brandId: brandId || undefined }), [brandId, version]);
  const t = text.owner.stock;

  return (
    <Stack gap={vars.spacing[4]}>
      <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
      <AsyncContent state={state}>
        {(data) => {
          const money = (amount: number) => format.money(amount, data.currency);
          const columns = [
            { key: 'name', label: text.common.name },
            { key: 'units', label: t.pieces, align: 'end' as const },
            { key: 'cost', label: t.atCost, align: 'end' as const },
            { key: 'retail', label: t.atPrice, align: 'end' as const },
          ];
          const rows = (list: typeof data.byBranch, name: (id: string) => string) =>
            list.map((row) => ({ key: row.id, cells: { name: name(row.id), units: format.number(row.units), cost: money(row.costValue), retail: money(row.retailValue) } }));
          return (
            <Stack gap={vars.spacing[4]}>
              <Grid>
                <StatCard label={t.pieces} value={format.number(data.total.units)} />
                <StatCard label={t.atCost} value={money(data.total.costValue)} highlight />
                <StatCard label={t.atPrice} value={money(data.total.retailValue)} />
              </Grid>
              <Card
                title={t.byBranch}
                actions={
                  <ExportButtons
                    title={t.tabs.value}
                    tables={() => [
                      { title: t.byBranch, headers: columns.map((column) => column.label), rows: data.byBranch.map((row) => [format.branch(row.id), row.units, Math.round(row.costValue), Math.round(row.retailValue)]) },
                      { title: t.byBrand, headers: columns.map((column) => column.label), rows: data.byBrand.map((row) => [format.brand(row.id), row.units, Math.round(row.costValue), Math.round(row.retailValue)]) },
                    ]}
                  />
                }
              >
                <Table label={t.byBranch} columns={columns} rows={rows(data.byBranch, format.branch)} />
              </Card>
              <Card title={t.byBrand}>
                <Table label={t.byBrand} columns={columns} rows={rows(data.byBrand, format.brand)} />
              </Card>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
