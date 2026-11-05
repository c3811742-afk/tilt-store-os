import { useNavigate, useParams } from 'react-router';
import { getCustomer, listCustomers } from '@/shared/api';
import { AsyncContent, Card, Notice, PageHeader, Stack, Table, Text, TextField, recordRows } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

const rowLimit = 300;

// The customer list: name, phone and purchase history.
export const CustomersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const [query, setQuery] = useQueryState('q', '');
  const version = useLiveVersion();
  const state = useAsync(() => listCustomers(query), [query, version]);
  const t = text.owner.customers;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <TextField type="search" label={text.common.search} placeholder={t.searchPlaceholder} value={query} onChange={setQuery} />
      <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
        {(rows) => (
          <Table
            label={t.title}
            columns={[
              { key: 'name', label: text.common.name },
              { key: 'phone', label: text.owner.fields.phone },
              { key: 'orders', label: t.orders, align: 'end' },
              { key: 'last', label: t.lastPurchase },
            ]}
            rows={recordRows(
              rows.slice(0, rowLimit),
              (row) => row.customer.id,
              [
                { key: 'name', label: '', render: (row) => row.customer.name },
                { key: 'phone', label: '', render: (row) => <span dir="ltr">{row.customer.phone}</span> },
                { key: 'orders', label: '', render: (row) => format.number(row.orders) },
                { key: 'last', label: '', render: (row) => (row.lastAt ? format.date(row.lastAt) : text.common.none) },
              ],
              (row) => navigate(toPath(routes.owner.customer, { customerId: row.customer.id })),
            )}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};

export const CustomerPage = () => {
  const { customerId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const state = useAsync(() => getCustomer(customerId), [customerId], (data) => data === null);
  const t = text.owner.customers;
  return (
    <AsyncContent state={state} empty={<Notice>{text.errors.notFound}</Notice>}>
      {(data) =>
        data && (
          <Stack gap={vars.spacing[5]}>
            <PageHeader back={{ to: routes.owner.customers, label: t.title }} title={data.customer.name} subtitle={<span dir="ltr">{data.customer.phone}</span>} />
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {fillText(t.since, { date: format.date(data.customer.createdAt), orders: format.number(data.sales.length) })}
            </Text>
            {data.sales.map(({ sale, total, items, returned }) => (
              <Card key={sale.id} title={`${sale.number} · ${format.branch(sale.branchId)} · ${format.dateTime(sale.at)}`} actions={<strong>{format.money(total, sale.currency)}</strong>}>
                <Table
                  label={sale.number}
                  columns={[
                    { key: 'item', label: text.owner.fields.product },
                    { key: 'qty', label: text.common.quantity, align: 'end' },
                    { key: 'paid', label: t.paid, align: 'end' },
                  ]}
                  rows={items.map((item, index) => ({ key: `${sale.id}-${index}`, cells: { item: item.label, qty: format.number(item.qty), paid: format.money(item.paid, sale.currency) } }))}
                />
                {returned > 0 && <Notice tone="warning">{fillText(t.returned, { count: format.number(returned) })}</Notice>}
              </Card>
            ))}
          </Stack>
        )
      }
    </AsyncContent>
  );
};
