import { getMorningSummary } from '@/shared/api';
import { AsyncContent, BarList, Card, PageHeader, Stack, StatCard } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { addDays, fillText, today } from '@/shared/utils';
import { useChange } from '../../hooks';
import styles from './MorningPage.module.css';

// One screen, made for a phone: how yesterday went and what needs the owner today.
export const MorningPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const change = useChange();
  const { session } = useSession();
  const version = useLiveVersion();
  const state = useAsync(() => getMorningSummary(session?.user.id ?? ''), [session?.user.id, version]);
  const t = text.owner.morning;

  return (
    <div className={styles.page}>
      <Stack gap={vars.spacing[4]}>
        <PageHeader title={fillText(t.title, { name: session?.user.name.split(' ')[0] ?? '' })} subtitle={format.date(today())} />
        <AsyncContent state={state}>
          {(data) => {
            const money = (amount: number) => format.money(amount, data.currency);
            return (
              <Stack gap={vars.spacing[3]}>
                <StatCard highlight label={t.yesterday} value={money(data.yesterday.net)} {...change(data.yesterday.net, data.yesterday.lastWeek, { label: t.sameDayLastWeek })} to={withQuery(routes.owner.dashboard, { period: 'custom', from: addDays(today(), -1), to: addDays(today(), -1) })} />
                <div className={styles.pair}>
                  <StatCard label={t.orders} value={format.number(data.yesterday.orders)} />
                  <StatCard label={t.grossProfit} value={money(data.yesterday.profit)} />
                </div>
                <div className={styles.pair}>
                  <StatCard label={t.todaySoFar} value={money(data.today.net)} detail={fillText(t.ordersCount, { count: format.number(data.today.orders) })} />
                  <StatCard label={t.monthToDate} value={money(data.monthToDate.net)} {...change(data.monthToDate.net, data.monthToDate.previous, { label: t.lastMonth })} />
                </div>
                <Card title={t.byBranch}>
                  <BarList items={data.branches.map((row) => ({ key: row.branchId, label: format.branch(row.branchId), value: row.net, display: money(row.net) }))} />
                </Card>
                <Card title={t.needsYou}>
                  <BarList
                    color={vars.colors.warning}
                    items={[
                      { key: 'approvals', label: t.approvals, value: data.pendingApprovals, display: format.number(data.pendingApprovals), to: routes.owner.approvals },
                      { key: 'alerts', label: t.alerts, value: data.newAlerts, display: format.number(data.newAlerts), to: routes.notifications },
                      { key: 'lowStock', label: t.lowStock, value: data.lowStockItems, display: format.number(data.lowStockItems), to: withQuery(routes.owner.stock, { tab: 'low' }) },
                      { key: 'receipts', label: t.failedReceipts, value: data.failedReceipts, display: format.number(data.failedReceipts), to: withQuery(routes.owner.tax, { tab: 'receipts' }) },
                    ]}
                  />
                </Card>
                {data.cashDifferences.length > 0 && (
                  <Card title={t.cashDifferences}>
                    <BarList
                      color={vars.colors.danger}
                      items={data.cashDifferences.map((row, index) => ({ key: `${row.branchId}-${index}`, label: format.branch(row.branchId), value: Math.abs(row.difference), display: format.money(row.difference, row.currency), to: withQuery(routes.owner.reports, { report: 'shifts' }) }))}
                    />
                  </Card>
                )}
              </Stack>
            );
          }}
        </AsyncContent>
      </Stack>
    </div>
  );
};
