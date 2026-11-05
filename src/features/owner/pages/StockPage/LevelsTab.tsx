import { Link } from 'react-router';
import { getStockLevels } from '@/shared/api';
import { AsyncContent, FilterBar, Notice, SelectField, Stack, Table, Text, TextField } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect, BrandSelect } from '../../components';

const rowLimit = 300; // the most rows drawn at once; narrow the filters to see others

// Pieces on hand of each variant in each branch, filtered by brand, product, size and colour.
export const LevelsTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [query, setQuery] = useQueryState('q', '');
  const [size, setSize] = useQueryState('size', '');
  const [color, setColor] = useQueryState('color', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const version = useLiveVersion();
  const state = useAsync(() => getStockLevels({ brandId: brandId || undefined, query, size: size || undefined, color: color || undefined, branchId: branchId || undefined }), [brandId, query, size, color, branchId, version]);
  const t = text.owner.stock;

  return (
    <Stack gap={vars.spacing[4]}>
      <FilterBar>
        <TextField type="search" label={text.owner.fields.product} placeholder={text.owner.products.searchPlaceholder} value={query} onChange={setQuery} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        <SelectField label={text.owner.fields.size} placeholder={text.common.all} value={size} onChange={setSize} options={settings.sizes.map((value) => ({ value, label: value }))} />
        <SelectField label={text.owner.fields.color} placeholder={text.common.all} value={color} onChange={setColor} options={settings.colors.map((value) => ({ value, label: value }))} />
        <BranchSelect kinds={['store', 'online', 'warehouse']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
      </FilterBar>
      <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
        {(data) => (
          <Stack gap={vars.spacing[2]}>
            <Text variant="caption" color={vars.colors.textMuted}>
              {data.rows.length > rowLimit ? `${format.number(rowLimit)} / ${format.number(data.rows.length)} · ${t.narrowFilters}` : format.number(data.rows.length)}
            </Text>
            <Table
              label={t.tabs.levels}
              columns={[
                { key: 'item', label: text.owner.fields.product },
                { key: 'variant', label: text.owner.fields.variant },
                ...data.branchIds.map((id) => ({ key: id, label: format.branch(id), align: 'end' as const })),
                { key: 'total', label: text.common.total, align: 'end' },
              ]}
              rows={data.rows.slice(0, rowLimit).map((row) => ({
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
        )}
      </AsyncContent>
    </Stack>
  );
};
