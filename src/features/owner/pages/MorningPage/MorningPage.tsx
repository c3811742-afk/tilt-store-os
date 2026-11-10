import { useNavigate } from 'react-router';
import { getMorningSummary } from '@/shared/api';
import { AsyncContent, BarList, Button, Card, Grid, Notice, PageHeader, Stack, StatCard } from '@/shared/components';
import { routes, toPath, withQuery } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { addDays, fillText, today } from '@/shared/utils';
import { useChange } from '../../hooks';

type Tone = 'danger' | 'warning' | 'info';

// The owner's morning, laid out as admin home screens usually are: first what needs action, most serious first
// (money missing, receipts the tax authority didn't get, then approvals, low stock, alerts), each with a link to it and
// only when there is something; then how yesterday went; then yesterday by branch.
export const MorningPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const change = useChange();
  const navigate = useNavigate();
  const { session } = useSession();
  const version = useLiveVersion();
  const state = useAsync(() => getMorningSummary(session?.user.id ?? ''), [session?.user.id, version]);
  const t = text.owner.morning;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={fillText(t.title, { name: session?.user.name.split(' ')[0] ?? '' })} subtitle={format.date(today())} />
      <AsyncContent state={state}>
        {(data) => {
          const money = (amount: number) => format.money(amount, data.currency);
          const count = (value: number) => ({ count: format.number(value) });
          const attention: { key: string; tone: Tone; message: string; to: string }[] = [
            ...data.cashDifferences.map((row, index) => ({ key: `cash-${index}`, tone: 'danger' as const, message: fillText(row.difference < 0 ? t.cashShort : t.cashOver, { branch: format.branch(row.branchId), amount: format.money(Math.abs(row.difference), row.currency) }), to: withQuery(routes.owner.reports, { view: 'shifts', branch: row.branchId }) })),
            ...(data.failedReceipts > 0 ? [{ key: 'receipts', tone: 'danger' as const, message: fillText(t.failedReceipts, count(data.failedReceipts)), to: withQuery(routes.owner.tax, { tab: 'receipts' }) }] : []),
            ...(data.pendingApprovals > 0 ? [{ key: 'approvals', tone: 'warning' as const, message: fillText(t.approvals, count(data.pendingApprovals)), to: routes.owner.approvals }] : []),
            ...data.pausedBrands
              .filter((row) => row.step !== 'onTheWay')
              .map((row) => ({ key: `paused-${row.brandId}`, tone: 'warning' as const, message: fillText(row.step === 'collect' ? t.pausedCollect : t.pausedReturn, { brand: format.brand(row.brandId), pieces: format.number(row.pieces) }), to: toPath(routes.owner.brand, { brandId: row.brandId }) })),
            ...(data.lowStockItems > 0 ? [{ key: 'lowStock', tone: 'warning' as const, message: fillText(t.lowStock, count(data.lowStockItems)), to: withQuery(routes.owner.stock, { tab: 'low' }) }] : []),
            ...(data.newAlerts > 0 ? [{ key: 'alerts', tone: 'info' as const, message: fillText(t.alerts, count(data.newAlerts)), to: routes.notifications }] : []),
          ];
          return (
            <Stack gap={vars.spacing[5]}>
              <Stack gap={vars.spacing[2]}>
                {attention.length === 0 ? (
                  <Notice tone="success">{t.allClear}</Notice>
                ) : (
                  attention.map((item) => (
                    <Notice
                      key={item.key}
                      tone={item.tone}
                      action={
                        <Button size="sm" variant="secondary" onClick={() => navigate(item.to)}>
                          {text.common.view}
                        </Button>
                      }
                    >
                      {item.message}
                    </Notice>
                  ))
                )}
              </Stack>
              <Grid columns={4}>
                <StatCard
                  highlight
                  label={fillText(t.yesterdayOrders, { count: format.number(data.yesterday.orders) })}
                  value={money(data.yesterday.net)}
                  {...change(data.yesterday.net, data.yesterday.lastWeek, { label: t.sameDayLastWeek })}
                  to={withQuery(routes.owner.dashboard, { period: 'custom', from: addDays(today(), -1), to: addDays(today(), -1) })}
                />
                <StatCard label={t.grossProfit} value={money(data.yesterday.profit)} />
                <StatCard label={t.todaySoFar} value={money(data.today.net)} detail={fillText(t.ordersCount, { count: format.number(data.today.orders) })} />
                <StatCard label={t.monthToDate} value={money(data.monthToDate.net)} {...change(data.monthToDate.net, data.monthToDate.previous, { label: t.lastMonth })} />
              </Grid>
              <Card title={t.byBranch}>
                <BarList items={data.branches.map((row) => ({ key: row.branchId, label: format.branch(row.branchId), value: row.net, display: money(row.net) }))} />
              </Card>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
