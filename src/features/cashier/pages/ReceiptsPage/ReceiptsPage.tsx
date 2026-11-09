import { useNavigate } from 'react-router';
import { listReceipts } from '@/shared/api';
import { AsyncContent, Badge, FilterBar, Notice, PageHeader, Stack, Table, TextField } from '@/shared/components';
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
  const state = useAsync(() => listReceipts(branch?.id ?? '', { query, day }), [branch?.id, query, day, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <FilterBar fieldWidth={vars.sizes.field.wide}>
        <TextField label={text.common.search} placeholder={t.search} type="search" value={query} onChange={setQuery} autoFocus />
        <TextField label={t.day} type="date" value={day} onChange={setDay} />
      </FilterBar>
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(rows) => (
          <Table
            label={t.title}
            stackOnMobile
            columns={[
              { key: 'number', label: text.cashier.mySales.receipt },
              { key: 'kind', label: text.common.status },
              { key: 'at', label: text.common.date },
              { key: 'customer', label: text.cashier.mySales.customer },
              { key: 'total', label: text.common.total, align: 'end' },
            ]}
            rows={rows.map((row) => ({
              key: row.id,
              onClick: () => navigate(toPath(routes.cashier.receipt, { saleId: row.id })),
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
