import { getOnlineStock, type OnlineAvailability, type OnlineSource } from '@/shared/api';
import { AsyncContent, Badge, BrandSelect, Button, CategorySelect, ColorSelect, FilterBar, Notice, PageHeader, SelectField, SizeSelect, Stack, Table, Text, TextField } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

const availabilities: OnlineAvailability[] = ['inStock', 'low', 'soldOut', 'reserved'];
const sources: OnlineSource[] = ['online', 'elsewhere'];

// What the website shows for each item right now. It updates on its own after every sale, order, transfer or
// cancellation, because it is worked out from the same stock movements as everything else.
// Filters are kept in the address, so a link or a reload opens the same list.
export const OnlineStockPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const [query, setQuery] = useQueryState('q', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [categoryId, setCategoryId] = useQueryState('category', '');
  const [size, setSize] = useQueryState('size', '');
  const [color, setColor] = useQueryState('color', '');
  const [availability, setAvailability] = useQueryState<OnlineAvailability | ''>('availability', '');
  const [source, setSource] = useQueryState<OnlineSource | ''>('source', '');
  const filtered = Boolean(query || brandId || categoryId || size || color || availability || source);
  const state = useAsync(
    () => getOnlineStock({ query, brandId: brandId || undefined, categoryId: categoryId || undefined, size: size || undefined, color: color || undefined, availability: availability || undefined, source: source || undefined }),
    [query, brandId, categoryId, size, color, availability, source, version],
    (data) => data.rows.length === 0,
  );
  const t = text.online.stock;

  const clear = () => {
    setQuery('');
    setBrandId('');
    setCategoryId('');
    setSize('');
    setColor('');
    setAvailability('');
    setSource('');
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <FilterBar
        actions={
          filtered && (
            <Button variant="secondary" size="sm" onClick={clear}>
              {text.common.clearFilters}
            </Button>
          )
        }
      >
        <TextField type="search" label={text.common.search} placeholder={t.searchPlaceholder} value={query} onChange={setQuery} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        <CategorySelect allLabel={text.owner.fields.allCategories} value={categoryId} onChange={setCategoryId} />
        <SizeSelect allLabel={text.common.all} value={size} onChange={setSize} />
        <ColorSelect allLabel={text.common.all} value={color} onChange={setColor} />
        <SelectField<OnlineAvailability | ''>
          label={t.availability}
          placeholder={text.common.all}
          value={availability}
          onChange={setAvailability}
          options={availabilities.map((value) => ({ value, label: t.availabilities[value] }))}
        />
        <SelectField<OnlineSource | ''> label={t.source} placeholder={text.common.all} value={source} onChange={setSource} options={sources.map((value) => ({ value, label: t.sources[value] }))} />
      </FilterBar>
      <AsyncContent state={state} empty={<Notice>{filtered ? t.none : t.empty}</Notice>}>
        {({ rows, total }) => (
          <Stack gap={vars.spacing[2]}>
            {total > rows.length && (
              <Text variant="caption" color={vars.colors.textMuted}>
                {fillText(t.showing, { shown: format.number(rows.length), total: format.number(total) })}
              </Text>
            )}
            <Table
              label={t.title}
              stackOnMobile
              columns={[
                { key: 'item', label: text.staff.items.item },
                { key: 'online', label: t.online, align: 'end' },
                { key: 'elsewhere', label: t.elsewhere, align: 'end' },
                { key: 'reserved', label: t.reserved, align: 'end' },
                { key: 'shown', label: t.shown, align: 'end' },
              ]}
              rows={rows.map((row) => ({
                key: row.variantId,
                cells: {
                  item: (
                    <Stack gap={vars.spacing[0]}>
                      <Text as="span" variant="bodySm" autoDirection>
                        {row.productName}
                      </Text>
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {[row.size, row.color, format.brand(row.brandId), row.sku].filter(Boolean).join(' · ')}
                      </Text>
                    </Stack>
                  ),
                  online: format.number(row.online),
                  elsewhere: format.number(row.elsewhere),
                  reserved: row.reserved ? format.number(row.reserved) : '',
                  shown: row.shown ? format.number(row.shown) : <Badge variant="danger">{t.soldOut}</Badge>,
                },
              }))}
            />
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
