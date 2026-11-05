import { Link, useNavigate } from 'react-router';
import { listProducts, type ProductRow } from '@/shared/api';
import { AsyncContent, Badge, Button, Checkbox, FilterBar, Icon, PageHeader, SelectField, Stack, Table, Text, TextField, Thumbnail, recordRows } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect, BrandSelect, CategorySelect } from '../../components';

// The catalog: every product with its brand, category, prices, margin and stock, filtered by brand, category or branch.
export const ProductsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { settings } = useReference();
  const [query, setQuery] = useQueryState('q', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [categoryId, setCategoryId] = useQueryState('category', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [season, setSeason] = useQueryState('season', '');
  const [archived, setArchived] = useQueryState('archived', '');
  const version = useLiveVersion();
  const state = useAsync(
    () => listProducts({ query, brandId: brandId || undefined, categoryId: categoryId || undefined, branchId: branchId || undefined, season: season || undefined, archived: archived === '1' }),
    [query, brandId, categoryId, branchId, season, archived, version],
  );
  const t = text.owner.products;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(routes.owner.categories)}>
              {text.nav.categories}
            </Button>
            <Button variant="secondary" onClick={() => navigate(routes.owner.importProducts)}>
              <Icon name="upload" />
              {t.import}
            </Button>
            <Button onClick={() => navigate(routes.owner.newProduct)}>
              <Icon name="plus" />
              {t.add}
            </Button>
          </>
        }
      />
      <FilterBar>
        <TextField type="search" label={text.common.search} placeholder={t.searchPlaceholder} value={query} onChange={setQuery} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        <CategorySelect allLabel={text.owner.fields.allCategories} value={categoryId} onChange={setCategoryId} />
        <BranchSelect kinds={['store', 'online', 'warehouse']} label={t.inStockAt} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
        <SelectField label={text.owner.fields.season} placeholder={text.common.all} value={season} onChange={setSeason} options={settings.seasons.map((value) => ({ value, label: value }))} />
      </FilterBar>
      <Checkbox label={text.common.showArchived} checked={archived === '1'} onChange={(checked) => setArchived(checked ? '1' : '')} />
      <AsyncContent state={state} empty={<Text color={vars.colors.textMuted}>{text.common.noResults}</Text>}>
        {(rows: ProductRow[]) => {
          const currencies = rows[0]?.pricing.map((row) => row.currency) ?? [];
          return (
            <Stack gap={vars.spacing[2]}>
              <Text variant="caption" color={vars.colors.textMuted}>
                {format.number(rows.length)} {t.countSuffix}
              </Text>
              <Table
                label={t.title}
                columns={[
                  { key: 'product', label: text.owner.fields.product },
                  { key: 'brand', label: text.owner.fields.brand },
                  { key: 'category', label: text.owner.fields.category },
                  ...currencies.map((currency) => ({ key: currency, label: currency, align: 'end' as const })),
                  { key: 'margin', label: text.owner.fields.margin, align: 'end' },
                  { key: 'stock', label: t.stock, align: 'end' },
                ]}
                rows={recordRows(
                  rows,
                  (row) => row.product.id,
                  [
                    {
                      key: 'product',
                      label: '',
                      render: (row) => (
                        <Stack direction="row" align="center" gap={vars.spacing[3]}>
                          <Thumbnail src={row.product.photo} name={row.product.name} />
                          <Stack gap={vars.spacing[0]}>
                            <Link to={toPath(routes.owner.product, { productId: row.product.id })}>{row.product.name}</Link>
                            <Text as="span" variant="caption" color={vars.colors.textMuted}>
                              {[row.product.season, row.product.collection, `${format.number(row.product.variants.filter((variant) => !variant.archived).length)} ${t.variantsSuffix}`].filter(Boolean).join(' · ')}
                            </Text>
                          </Stack>
                        </Stack>
                      ),
                    },
                    { key: 'brand', label: '', render: (row) => format.brand(row.product.brandId) },
                    { key: 'category', label: '', render: (row) => format.category(row.product.categoryId) },
                    ...currencies.map((currency) => ({
                      key: currency,
                      label: '',
                      render: (row: ProductRow) => {
                        const pricing = row.pricing.find((current) => current.currency === currency);
                        return pricing?.price === null || pricing === undefined ? <Badge variant="warning">{t.noPrice}</Badge> : format.money(pricing.price, currency);
                      },
                    })),
                    {
                      key: 'margin',
                      label: '',
                      render: (row) => {
                        const margin = row.pricing[0]?.margin;
                        return (
                          <Stack direction="row" gap={vars.spacing[1]} justify="flex-end" align="center">
                            {row.belowMinimum && <Badge variant="danger">{t.belowMinimum}</Badge>}
                            {margin === null || margin === undefined ? '' : format.percent(margin)}
                          </Stack>
                        );
                      },
                    },
                    { key: 'stock', label: '', render: (row) => format.number(row.stock) },
                  ],
                  (row) => navigate(toPath(routes.owner.product, { productId: row.product.id })),
                )}
              />
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
