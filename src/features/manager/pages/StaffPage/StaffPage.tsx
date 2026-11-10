import { getBranchStaff, type BranchPeriod } from '@/shared/api';
import { AsyncContent, Badge, Notice, PageHeader, SegmentedControl, Stack, Table, Tabs, Text } from '@/shared/components';
import { userStatusTone } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import type { UserStatus } from '@/shared/types';
import { vars } from '@/shared/theme';
import { branchPeriods } from '../../constants/periods';

type StaffTab = 'staff' | 'discounts';

// The branch's people, the sales each cashier rang up, and every manual discount they gave.
export const StaffPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<StaffTab>('tab', 'staff');
  const [period, setPeriod] = useQueryState<BranchPeriod>('period', 'week');
  const state = useAsync(() => getBranchStaff(branchId, period), [branchId, period, version]);
  const t = text.manager.staff;
  const periodLabels = text.manager.dashboard.periods;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        actions={<SegmentedControl<BranchPeriod> label={text.owner.period.label} value={period} onChange={setPeriod} options={branchPeriods.map((value) => ({ value, label: periodLabels[value] }))} />}
      />
      <Tabs<StaffTab> label={t.title} value={tab} onChange={setTab} tabs={(['staff', 'discounts'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        <AsyncContent state={state}>
          {(data) => {
            const money = (amount: number) => format.money(amount, data.currency);
            if (tab === 'discounts')
              return data.discounts.length ? (
                <Table
                  label={t.tabs.discounts}
                  stackOnMobile
                  columns={[
                    { key: 'when', label: text.common.when },
                    { key: 'cashier', label: text.owner.fields.cashier },
                    { key: 'sale', label: t.sale },
                    { key: 'product', label: text.owner.fields.product },
                    { key: 'reason', label: text.common.reason },
                    { key: 'amount', label: text.common.amount, align: 'end' },
                  ]}
                  rows={data.discounts.map((row) => ({
                    key: row.id,
                    values: { when: row.at },
                    cells: {
                      when: format.dateTime(row.at),
                      cashier: format.user(row.cashierId),
                      sale: row.saleNumber,
                      product: (
                        <Text as="span" variant="bodySm" autoDirection>
                          {row.productName}
                        </Text>
                      ),
                      reason: format.option(row.reasonId) || text.common.notSet,
                      amount: money(row.amount),
                    },
                  }))}
                />
              ) : (
                <Notice>{t.noDiscounts}</Notice>
              );
            return data.staff.length ? (
              <Table
                label={t.tabs.staff}
                stackOnMobile
                columns={[
                  { key: 'name', label: text.common.name },
                  { key: 'role', label: t.role },
                  { key: 'status', label: text.common.status },
                  { key: 'net', label: t.net, align: 'end' },
                  { key: 'orders', label: t.orders, align: 'end' },
                  { key: 'units', label: t.units, align: 'end' },
                  { key: 'discounts', label: t.discounts, align: 'end' },
                  { key: 'count', label: t.discountCount, align: 'end' },
                  { key: 'share', label: t.discountShare, align: 'end' },
                ]}
                rows={data.staff.map((row) => ({
                  key: row.userId,
                  cells: {
                    name: row.name,
                    role: row.roleIds.map(format.role).join(text.common.listSeparator),
                    status: <Badge variant={userStatusTone[row.status as UserStatus]}>{text.owner.staff.statuses[row.status as UserStatus]}</Badge>,
                    net: money(row.net),
                    orders: format.number(row.orders),
                    units: format.number(row.units),
                    discounts: money(row.discount),
                    count: format.number(row.discountCount),
                    share: format.percent(row.discountShare),
                  },
                }))}
              />
            ) : (
              <Notice>{t.noStaff}</Notice>
            );
          }}
        </AsyncContent>
      </Tabs>
    </Stack>
  );
};
