import { useState } from 'react';
import { getOnlineStock } from '@/shared/api';
import { AsyncContent, Badge, FilterBar, Notice, PageHeader, Stack, Table, Text, TextField } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// What the website shows for each item right now. It updates on its own after every sale, order, transfer or
// cancellation, because it is worked out from the same stock movements as everything else.
export const OnlineStockPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const [query, setQuery] = useState('');
  const state = useAsync(() => getOnlineStock(query), [query, version]);
  const t = text.online.stock;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <FilterBar>
        <TextField type="search" label={text.common.search} value={query} onChange={setQuery} />
      </FilterBar>
      <AsyncContent state={state} empty={<Notice>{t.none}</Notice>}>
        {(rows) => (
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
        )}
      </AsyncContent>
    </Stack>
  );
};
