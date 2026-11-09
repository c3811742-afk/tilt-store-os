import { Link } from 'react-router';
import { getStockValue, type StockFilter } from '@/shared/api';
import { AsyncContent, Card, Grid, Stack, StatCard, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useTableSort } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { ExportButtons } from '../../components';

type Value = { id: string; units: number; costValue: number; retailValue: number };

const productRowLimit = 300; // the most product rows drawn at once (the export has them all)

// Pieces and their value at cost and at selling price: in total, per branch and per brand. One branch is valued in its
// own currency; with branches in other currencies, each branch shows its own and the converted value (which add up).
export const ValueTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getStockValue(filter), [JSON.stringify(filter), version]);
  const branchTable = useTableSort({ key: 'cost', direction: 'desc' });
  const brandTable = useTableSort({ key: 'cost', direction: 'desc' });
  const productTable = useTableSort({ key: 'cost', direction: 'desc' });
  const t = text.owner.stock;
  const valueOf = (name: (id: string) => string) => (row: Value, key: string) => (key === 'name' ? name(row.id) : key === 'units' ? row.units : key === 'retail' ? row.retailValue : row.costValue);

  return (
    <AsyncContent state={state}>
      {(data) => {
        const money = (amount: number) => format.money(amount, data.currency);
        const mixed = data.byBranch.some((row) => row.own.currency !== data.currency);
        const inCurrency = fillText(text.owner.dashboard.inCurrency, { currency: data.currency });
        const columns = [
          { key: 'name', label: text.common.name, sortable: true },
          { key: 'units', label: t.pieces, align: 'end' as const, sortable: true },
          { key: 'cost', label: t.atCost, align: 'end' as const, sortable: true },
          { key: 'retail', label: t.atPrice, align: 'end' as const, sortable: true },
        ];
        const branchColumns = mixed
          ? [...columns, { key: 'costConverted', label: `${t.atCost} · ${inCurrency}`, align: 'end' as const }, { key: 'retailConverted', label: `${t.atPrice} · ${inCurrency}`, align: 'end' as const }]
          : columns;
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
                    { title: t.byProduct, headers: [text.owner.fields.product, text.owner.fields.brand, ...columns.slice(1).map((column) => column.label)], rows: data.byProduct.map((row) => [row.name, format.brand(row.brandId), row.units, Math.round(row.costValue), Math.round(row.retailValue)]) },
                  ]}
                />
              }
            >
              <Table
                label={t.byBranch}
                sort={branchTable.sort}
                onSortChange={branchTable.setSort}
                columns={branchColumns}
                rows={branchTable.sorted(data.byBranch, valueOf(format.branch)).map((row) => ({
                  key: row.id,
                  cells: {
                    name: format.branch(row.id),
                    units: format.number(row.units),
                    cost: format.money(row.own.costValue, row.own.currency),
                    retail: format.money(row.own.retailValue, row.own.currency),
                    costConverted: money(row.costValue),
                    retailConverted: money(row.retailValue),
                  },
                }))}
                footer={data.byBranch.length > 1 ? { name: text.common.total, units: format.number(data.total.units), [mixed ? 'costConverted' : 'cost']: money(data.total.costValue), [mixed ? 'retailConverted' : 'retail']: money(data.total.retailValue) } : undefined}
              />
            </Card>
            <Card title={t.byBrand}>
              <Table
                label={t.byBrand}
                sort={brandTable.sort}
                onSortChange={brandTable.setSort}
                columns={columns}
                rows={brandTable.sorted(data.byBrand, valueOf(format.brand)).map((row) => ({ key: row.id, cells: { name: format.brand(row.id), units: format.number(row.units), cost: money(row.costValue), retail: money(row.retailValue) } }))}
                footer={{ name: text.common.total, units: format.number(data.total.units), cost: money(data.total.costValue), retail: money(data.total.retailValue) }}
              />
            </Card>
            <Card title={t.byProduct}>
              <Table
                label={t.byProduct}
                sort={productTable.sort}
                onSortChange={productTable.setSort}
                columns={[{ key: 'name', label: text.owner.fields.product, sortable: true }, ...columns.slice(1)]}
                rows={productTable
                  .sorted(data.byProduct, (row, key) => (key === 'name' ? row.name : key === 'units' ? row.units : key === 'retail' ? row.retailValue : row.costValue))
                  .slice(0, productRowLimit)
                  .map((row) => ({
                    key: row.id,
                    cells: {
                      name: (
                        <Stack gap={vars.spacing[0]}>
                          <Link to={toPath(routes.owner.product, { productId: row.id })}>{row.name}</Link>
                          <Text as="span" variant="caption" color={vars.colors.textMuted}>
                            {format.brand(row.brandId)}
                          </Text>
                        </Stack>
                      ),
                      units: format.number(row.units),
                      cost: money(row.costValue),
                      retail: money(row.retailValue),
                    },
                  }))}
                footer={{ name: text.common.total, units: format.number(data.total.units), cost: money(data.total.costValue), retail: money(data.total.retailValue) }}
              />
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
