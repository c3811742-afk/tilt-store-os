import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listBrands, type BrandRow } from '@/shared/api';
import { AsyncContent, Badge, Button, FilterBar, Icon, PageHeader, SelectField, Stack, Table, Text, TextField, Thumbnail, recordRows } from '@/shared/components';
import { brandModels, routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { matchesText } from '@/shared/utils';
import { useTermsSummary } from '../../hooks/useTermsSummary';

// Every brand in one list, with its deal and how many products it has.
export const BrandsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { deal } = useTermsSummary();
  const version = useLiveVersion();
  const state = useAsync(listBrands, [version]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [model, setModel] = useState('');
  const t = text.owner.brands;

  const filter = useMemo(
    () => (rows: BrandRow[]) =>
      rows.filter((row) => matchesText(query, row.brand.name, row.brand.contactName, row.brand.instagram) && (!status || row.brand.status === status) && (!model || row.terms.model === model)),
    [query, status, model],
  );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        actions={
          <Button onClick={() => navigate(routes.owner.newBrand)}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      <FilterBar>
        <TextField type="search" label={text.common.search} placeholder={t.searchPlaceholder} value={query} onChange={setQuery} />
        <SelectField label={text.common.status} value={status} onChange={setStatus} placeholder={text.common.all} options={[{ value: 'active', label: t.statuses.active }, { value: 'paused', label: t.statuses.paused }]} />
        <SelectField label={t.terms.model} value={model} onChange={setModel} placeholder={text.common.all} options={brandModels.map((value) => ({ value, label: t.terms.models[value] }))} />
      </FilterBar>
      <AsyncContent state={state}>
        {(rows) => {
          const shown = filter(rows);
          return (
            <Stack gap={vars.spacing[2]}>
              <Table
                label={t.title}
                emptyText={text.common.noResults}
                columns={[
                  { key: 'brand', label: text.owner.fields.brand },
                  { key: 'deal', label: t.terms.deal },
                  { key: 'products', label: t.products, align: 'end' },
                  { key: 'payouts', label: t.terms.payoutFrequency },
                  { key: 'status', label: text.common.status },
                ]}
                rows={recordRows(
                  shown,
                  (row) => row.brand.id,
                  [
                    {
                      key: 'brand',
                      label: '',
                      render: (row) => (
                        <Stack direction="row" align="center" gap={vars.spacing[3]}>
                          <Thumbnail src={row.brand.logo} name={row.brand.name} />
                          <Stack gap={vars.spacing[0]}>
                            <Text as="span" variant="h4" autoDirection>
                              {row.brand.name}
                            </Text>
                            {(row.brand.instagram || row.brand.contactName) && (
                              <Text as="span" variant="caption" color={vars.colors.textMuted}>
                                {row.brand.instagram || row.brand.contactName}
                              </Text>
                            )}
                          </Stack>
                        </Stack>
                      ),
                    },
                    { key: 'deal', label: '', render: (row) => deal(row.terms) },
                    { key: 'products', label: '', render: (row) => format.number(row.activeProductCount) },
                    { key: 'payouts', label: '', render: (row) => (row.terms.model === 'own' ? text.common.none : t.terms.frequencies[row.terms.payoutFrequency]) },
                    { key: 'status', label: '', render: (row) => <Badge variant={row.brand.status === 'active' ? 'success' : 'neutral'}>{t.statuses[row.brand.status]}</Badge> },
                  ],
                  (row) => navigate(toPath(routes.owner.brand, { brandId: row.brand.id })),
                )}
              />
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
