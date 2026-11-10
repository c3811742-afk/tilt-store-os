import { useNavigate } from 'react-router';
import { listReceipts } from '@/shared/api';
import { AsyncContent, Badge, FilterToolbar, Notice, PageHeader, Stack, Table, TextField, filterField, useTableFilters } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// Past receipts in the branch: search to print one again or send it.
export const ReceiptsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const [query, setQuery] = useQueryState('q', '');
  const [day, setDay] = useQueryState('day', '');
  const t = text.cashier.receipts;
  const columnFilters = useTableFilters();
  const state = useAsync(() => listReceipts(branch?.id ?? '', { query, day }), [branch?.id, query, day, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <FilterToolbar
        leading={<TextField label={text.common.search} placeholder={t.search} type="search" value={query} onChange={setQuery} autoFocus />}
        fields={[filterField('day', <TextField label={t.day} type="date" value={day} onChange={setDay} />, { label: t.day, value: day && format.date(day), clear: () => setDay('') })]}
        table={columnFilters}
      />
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(rows) => (
          <Table
            filters={columnFilters}
            label={t.title}
            stackOnMobile
            columns={[
              // The receipt number, the customer and the day are the search box and the Day filter.
              { key: 'number', label: text.cashier.mySales.receipt, filterable: false },
              { key: 'kind', label: text.common.status },
              { key: 'at', label: text.common.date, filterable: false },
              { key: 'customer', label: text.cashier.mySales.customer, filterable: false },
              { key: 'total', label: text.common.total, align: 'end' },
            ]}
            rows={rows.map((row) => ({
              key: row.id,
              onClick: () => navigate(toPath(routes.cashier.receipt, { saleId: row.id })),
              values: { at: row.at },
              cells: {
                number: row.number,
                kind: <span><Badge variant={row.kind === 'sale' ? 'neutral' : 'info'}>{t.kinds[row.kind]}</Badge></span>,
                at: format.dateTime(row.at),
                customer: [row.customerName, row.phone].filter(Boolean).join(' · '),
                total: format.money(row.total, row.currency),
              },
            }))}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
