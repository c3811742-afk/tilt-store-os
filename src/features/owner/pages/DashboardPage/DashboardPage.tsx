import { Link, useNavigate } from 'react-router';
import { getDashboard, type Dashboard } from '@/shared/api';
import { AsyncContent, BarList, Button, Card, ColumnChart, Grid, Notice, PageHeader, Stack, StatCard, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { daysBetween, fillText, marginPercent } from '@/shared/utils';
import { BranchSelect, BrandSelect, PeriodFilter } from '../../components';
import { useChange, usePeriod } from '../../hooks';
import styles from './DashboardPage.module.css';

const chartLabelEvery = 7; // a date under every 7th column on long periods

// The owner's quick picture, as admin dashboards keep it: the filters in one row, what is waiting, four headline
// figures of the same size, sales by day, then sales by branch beside the top sellers. Everything in more detail
// (profit and loss, brands across branches, slow movers, stock value, losses) is in Reports, Stock and Defects.
export const DashboardPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const change = useChange();
  const navigate = useNavigate();
  const period = usePeriod('month');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const version = useLiveVersion();
  const state = useAsync(() => getDashboard({ range: period.range, branchId: branchId || undefined, brandId: brandId || undefined }), [period.range.from, period.range.to, branchId, brandId, version]);
  const t = text.owner.dashboard;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <div className={styles.filters}>
        <PeriodFilter period={period} />
        <BranchSelect label={t.scope} allLabel={t.allBranches} value={branchId} onChange={setBranchId} width={vars.sizes.field.narrow} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} width={vars.sizes.field.narrow} />
      </div>
      <AsyncContent state={state}>
        {(data: Dashboard) => {
          const money = (amount: number) => format.money(amount, data.currency);
          const { totals, previous } = data;
          const days = daysBetween(period.range.from, period.range.to) + 1;
          // Each branch's sales in its own currency; with branches in other currencies, also converted, so they add up.
          const mixed = data.branches.some((row) => row.currency !== data.currency);
          return (
            <Stack gap={vars.spacing[5]}>
              {data.pendingApprovals > 0 && (
                <Notice
                  tone="warning"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => navigate(routes.owner.approvals)}>
                      {t.review}
                    </Button>
                  }
                >
                  {fillText(t.approvalsWaiting, { count: format.number(data.pendingApprovals) })}
                </Notice>
              )}

              <Grid columns={4}>
                <StatCard highlight label={t.netSales} value={money(totals.net)} {...change(totals.net, previous.net)} to={routes.owner.reports} />
                <StatCard label={fillText(t.grossProfitMargin, { margin: format.percent(marginPercent(totals.profit, totals.net)) })} value={money(totals.profit)} {...change(totals.profit, previous.profit)} />
                <StatCard label={t.netProfit} value={money(data.netProfit)} {...change(data.netProfit, data.previousNetProfit)} to={toPath(routes.owner.report, { reportId: 'pnl' })} />
                <StatCard label={t.orders} value={format.number(totals.orders)} {...change(totals.orders, previous.orders)} />
              </Grid>

              <Card title={t.salesOverTime} actions={<Text as="span" variant="caption" color={vars.colors.textMuted}>{t.chartLegend}</Text>}>
                <ColumnChart
                  label={t.salesOverTime}
                  labelEvery={days > chartLabelEvery * 2 ? chartLabelEvery : 1}
                  points={data.daily.map((point) => ({ key: point.day, label: format.shortDate(point.day), value: point.net, previous: point.previous, display: money(point.net) }))}
                />
              </Card>

              <Grid columns={2} alignItems="start">
                <Card title={t.branches}>
                  <Table
                    label={t.branches}
                    columns={[
                      { key: 'branch', label: text.owner.fields.branch },
                      { key: 'net', label: t.netSales, align: 'end' },
                      ...(mixed ? [{ key: 'converted', label: fillText(t.inCurrency, { currency: data.currency }), align: 'end' as const }] : []),
                      { key: 'orders', label: t.orders, align: 'end' },
                    ]}
                    rows={data.branches.map((row) => ({ key: row.branchId, cells: { branch: format.branch(row.branchId), net: format.money(row.netLocal, row.currency), converted: money(row.net), orders: format.number(row.orders) } }))}
                    footer={
                      data.branches.length > 1
                        ? { branch: t.combined, [mixed ? 'converted' : 'net']: money(data.branches.reduce((sum, row) => sum + row.net, 0)), orders: format.number(data.branches.reduce((sum, row) => sum + row.orders, 0)) }
                        : undefined
                    }
                  />
                </Card>
                <Card title={t.topProducts}>
                  <BarList
                    label={t.topProducts}
                    items={data.topProducts.map((row) => ({ key: row.id, label: row.label, value: row.units, display: fillText(t.units, { count: format.number(row.units) }), detail: money(row.net), to: toPath(routes.owner.product, { productId: row.id }) }))}
                  />
                </Card>
              </Grid>

              <Text variant="caption" color={vars.colors.textMuted}>
                {fillText(branchId ? t.footnoteOwn : t.footnote, { currency: data.currency })} <Link to={routes.owner.reports}>{t.allReports}</Link>
              </Text>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
