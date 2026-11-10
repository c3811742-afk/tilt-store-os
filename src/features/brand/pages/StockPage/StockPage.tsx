import { getBrandStock } from '@/shared/api';
import { AsyncContent, Badge, Checkbox, FilterToolbar, OfflineStockNotice, PageHeader, Stack, Table, Text, TextField, filterField, useTableFilters } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// The brand's stock in every branch, by size and colour, with the items that need restocking.
export const StockPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const [lowOnly, setLowOnly] = useQueryState('low', '');
  const [query, setQuery] = useQueryState('q', '');
  const [productId] = useQueryState('product', '');
  const t = text.brandPortal.stock;
  const columnFilters = useTableFilters();
  const state = useAsync(getBrandStock, [version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <OfflineStockNotice />
      <FilterToolbar
        leading={<TextField label={text.common.search} placeholder={t.search} type="search" value={query} onChange={setQuery} />}
        fields={[filterField('low', <Checkbox label={t.lowOnly} checked={Boolean(lowOnly)} onChange={(checked) => setLowOnly(checked ? '1' : '')} />, { label: t.lowOnly, value: lowOnly && text.common.yes, clear: () => setLowOnly('') })]}
        table={columnFilters}
      />
      <AsyncContent state={state}>
        {({ branches, rows }) => {
          const needle = query.trim().toLowerCase();
          const shown = rows.filter((row) => (!lowOnly || row.low.length > 0) && (!productId || row.productId === productId) && (!needle || `${row.name} ${row.size} ${row.color} ${row.sku}`.toLowerCase().includes(needle)));
          const name = (branchId: string) => branches.find((branch) => branch.id === branchId)?.name ?? '';
          return (
            <Table paged
              filters={columnFilters}
              label={t.title}
              stackOnMobile
              emptyText={t.empty}
              columns={[
                { key: 'item', label: t.variant, filterable: false }, // the search box
                ...branches.map((branch) => ({ key: branch.id, label: branch.name, align: 'end' as const })),
                { key: 'total', label: t.total, align: 'end' },
                { key: 'low', label: t.low, filterable: false }, // Low stock only
              ]}
              rows={shown.map((row) => ({
                key: row.variantId,
                cells: {
                  item: (
                    <Stack gap={vars.spacing[1]}>
                      <Text as="span" variant="bodySm" autoDirection>
                        {row.name}
                      </Text>
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {row.size} · {row.color} · {row.sku}
                      </Text>
                    </Stack>
                  ),
                  ...Object.fromEntries(branches.map((branch) => [branch.id, format.number(row.byBranch[branch.id] ?? 0)])),
                  total: format.number(row.total),
                  low: row.low.length ? <span><Badge variant="warning">{fillText(t.lowIn, { branches: row.low.map((entry) => name(entry.branchId)).join(text.common.listSeparator) })}</Badge></span> : null,
                },
              }))}
            />
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
