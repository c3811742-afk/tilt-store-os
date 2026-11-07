import { useState } from 'react';
import { useNavigate } from 'react-router';
import { findCustomers } from '@/shared/api';
import { AsyncContent, Notice, PageHeader, SearchBox, Stack, Table } from '@/shared/components';
import { routes, toPath, tillDefaults } from '@/shared/constants';
import { useAsync, useFormat, useLocale, useWorkBranch } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { phoneDigits } from '@/shared/utils';

// Find a customer by phone number.
export const CustomersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branch } = useWorkBranch();
  const [phone, setPhone] = useState('');
  const t = text.cashier.customers;
  const state = useAsync(() => findCustomers(phone), [phone]);
  const currency = branch?.currency ?? '';

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <SearchBox label={t.search} placeholder={t.search} inputMode="tel" value={phone} onChange={setPhone} onSubmit={() => undefined} autoFocus />
      {phoneDigits(phone).length < tillDefaults.searchDigits ? (
        <Notice>{t.empty}</Notice>
      ) : (
        <AsyncContent state={state} empty={<Notice>{t.none}</Notice>}>
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
      )}
    </Stack>
  );
};
