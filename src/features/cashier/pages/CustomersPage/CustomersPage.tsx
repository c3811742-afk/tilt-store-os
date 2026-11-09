import { useState } from 'react';
import { useNavigate } from 'react-router';
import { findCustomers, listRecentCustomers } from '@/shared/api';
import { AsyncContent, Notice, PageHeader, SearchBox, Stack, Table } from '@/shared/components';
import { routes, toPath, tillDefaults } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { phoneDigits } from '@/shared/utils';

// The till's customers: the most recent first, and a search by phone number for anyone else.
export const CustomersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branch } = useBranchScope();
  const [phone, setPhone] = useState('');
  const t = text.cashier.customers;
  const version = useLiveVersion();
  const searching = phoneDigits(phone).length >= tillDefaults.searchDigits;
  const state = useAsync(() => (searching ? findCustomers(phone) : listRecentCustomers()), [phone, searching, version]);
  const currency = branch?.currency ?? '';

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <SearchBox label={t.search} placeholder={t.search} inputMode="tel" value={phone} onChange={setPhone} onSubmit={() => undefined} autoFocus />
      <AsyncContent state={state} empty={<Notice>{searching ? t.none : t.empty}</Notice>}>
          {(list) => (
            <Table
              label={t.title}
              stackOnMobile
              columns={[
                { key: 'name', label: text.common.name },
                { key: 'phone', label: t.search },
                { key: 'orders', label: t.orders, align: 'end' },
                { key: 'credit', label: t.storeCredit, align: 'end' },
              ]}
              rows={list.map((customer) => ({
                key: customer.id,
                onClick: () => navigate(toPath(routes.cashier.customer, { customerId: customer.id })),
                cells: { name: customer.name, phone: <bdi>{customer.phone}</bdi>, orders: format.number(customer.orders), credit: format.money(customer.storeCredit, currency) },
              }))}
            />
          )}
      </AsyncContent>
    </Stack>
  );
};
