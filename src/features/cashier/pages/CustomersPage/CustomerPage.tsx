import { useParams, useNavigate } from 'react-router';
import { getTillCustomer } from '@/shared/api';
import { AsyncContent, Card, DetailList, Notice, PageHeader, Stack, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, ageFromBirthYear } from '@/shared/utils';

// A customer's details, store credit and past purchases.
export const CustomerPage = () => {
  const { customerId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branch } = useBranchScope();
  const t = text.cashier.customers;
  const state = useAsync(() => getTillCustomer(customerId), [customerId]);

  return (
    <AsyncContent state={state}>
      {({ customer, purchases }) => (
        <Stack gap={vars.spacing[5]}>
          <PageHeader title={customer.name} back={{ to: routes.cashier.customers, label: t.title }} />
          <Card>
            <DetailList
              items={[
                { key: 'phone', label: t.search, value: <bdi>{customer.phone}</bdi> },
                { key: 'orders', label: t.orders, value: format.number(customer.orders) },
                { key: 'credit', label: t.storeCredit, value: format.money(customer.storeCredit, branch?.currency ?? '') },
                ...(customer.birthYear ? [{ key: 'age', label: text.common.age, value: format.number(ageFromBirthYear(customer.birthYear)) }] : []),
              ]}
            />
          </Card>
          <Card title={t.purchases}>
            {purchases.length ? (
              <Table
                label={t.purchases}
                stackOnMobile
                columns={[
                  { key: 'number', label: text.cashier.mySales.receipt },
                  { key: 'date', label: text.common.date },
                  { key: 'items', label: text.cashier.receipt.item },
                  { key: 'total', label: text.common.total, align: 'end' },
                ]}
                rows={purchases.map((purchase) => ({
                  key: purchase.saleId,
                  onClick: () => navigate(toPath(routes.cashier.receipt, { saleId: purchase.saleId })),
                  cells: {
                    number: purchase.number,
                    date: `${format.date(purchase.at)} · ${purchase.branchName}`,
                    items: purchase.lines.map((line) => `${line.name} ${line.size} ${line.color} × ${line.qty}${line.returned ? ` (${fillText(t.returned, { count: line.returned })})` : ''}`).join(text.common.listSeparator),
                    total: format.money(purchase.total, purchase.currency),
                  },
                }))}
              />
            ) : (
              <Notice>{t.noPurchases}</Notice>
            )}
          </Card>
        </Stack>
      )}
    </AsyncContent>
  );
};
