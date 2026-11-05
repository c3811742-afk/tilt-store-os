import { useState } from 'react';
import { getDashboard, type Dashboard } from '@/shared/api';
import {
  AsyncContent,
  BarList,
  Card,
  ColumnChart,
  ErrorBoundary,
  Grid,
  PageHeader,
  SegmentedControl,
  Stack,
  StatCard,
  Table,
  Text,
} from '@/shared/components';
import { Link } from 'react-router';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { daysBetween, fillText, marginPercent } from '@/shared/utils';
import { BranchSelect, BrandSelect, PeriodFilter } from '../../components';
import { useChange, usePeriod } from '../../hooks';
import { NetProfitCard } from './NetProfitCard';
import { LossesCard } from './LossesCard';
import styles from './DashboardPage.module.css';

type BrandMetric = 'net' | 'profit' | 'sellThrough';
const chartLabelEvery = 7; // a date under every 7th column on long periods

export const DashboardPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const change = useChange();
  const period = usePeriod('month');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [metric, setMetric] = useState<BrandMetric>('net');
  const version = useLiveVersion();
  const state = useAsync(() => getDashboard({ range: period.range, branchId: branchId || undefined, brandId: brandId || undefined }), [period.range.from, period.range.to, branchId, brandId, version]);
  const t = text.owner.dashboard;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Stack gap={vars.spacing[3]}>
        <PeriodFilter period={period} />
        <div className={styles.filters}>
          <BranchSelect label={t.scope} allLabel={t.allBranches} value={branchId} onChange={setBranchId} />
          <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        </div>
      </Stack>
      <AsyncContent state={state}>
        {(data: Dashboard) => {
          const money = (amount: number) => format.money(amount, data.currency);
          const { totals, previous } = data;
          const margin = marginPercent(totals.profit, totals.net);
          const previousMargin = marginPercent(previous.profit, previous.net);
          const marginChange = Math.round((margin - previousMargin) * 10) / 10;
          const days = daysBetween(period.range.from, period.range.to) + 1;
          return (
            <Stack gap={vars.spacing[5]}>
              <Grid>
                {data.quick.map((quick) => (
                  <StatCard key={quick.key} label={t.quick[quick.key]} value={money(quick.net)} {...change(quick.net, quick.previous, { label: t.quickCompare[quick.key] })} />
                ))}
              </Grid>

              <Grid>
                <StatCard highlight label={t.netSales} value={money(totals.net)} {...change(totals.net, previous.net)} to={routes.owner.reports} />
                <StatCard label={t.cost} value={money(totals.cost)} {...change(totals.cost, previous.cost, { lowerIsBetter: true })} />
                <StatCard label={t.grossProfit} value={money(totals.profit)} {...change(totals.profit, previous.profit)} />
                <StatCard
                  label={t.margin}
                  value={format.percent(margin)}
                  detail={fillText(marginChange >= 0 ? t.pointsUp : t.pointsDown, { points: format.number(Math.abs(marginChange)) })}
                  trend={marginChange > 0 ? 'up' : marginChange < 0 ? 'down' : 'flat'}
                />
                <StatCard label={t.netProfit} value={money(data.netProfit)} {...change(data.netProfit, data.previousNetProfit)} />
                <StatCard label={t.orders} value={format.number(totals.orders)} {...change(totals.orders, previous.orders)} />
              </Grid>

              <Card title={t.salesOverTime} actions={<Text as="span" variant="caption" color={vars.colors.textMuted}>{t.chartLegend}</Text>}>
                <ColumnChart
                  label={t.salesOverTime}
                  labelEvery={days > chartLabelEvery * 2 ? chartLabelEvery : 1}
                  points={data.daily.map((point) => ({ key: point.day, label: format.shortDate(point.day), value: point.net, previous: point.previous, display: money(point.net) }))}
                />
              </Card>

              <div className={styles.split}>
                <ErrorBoundary>
                  <NetProfitCard data={data} />
                </ErrorBoundary>
                <ErrorBoundary>
                  <LossesCard data={data} range={period.range} />
                </ErrorBoundary>
              </div>

              <Card title={t.branches}>
                <Table
                  label={t.branches}
                  columns={[
                    { key: 'branch', label: text.owner.fields.branch },
                    { key: 'local', label: t.ownCurrency, align: 'end' },
                    { key: 'net', label: fillText(t.inCurrency, { currency: data.currency }), align: 'end' },
                    { key: 'profit', label: t.grossProfit, align: 'end' },
                    { key: 'orders', label: t.orders, align: 'end' },
                  ]}
                  rows={data.branches.map((row) => ({
                    key: row.branchId,
                    cells: {
                      branch: format.branch(row.branchId),
                      local: format.money(row.netLocal, row.currency),
                      net: money(row.net),
                      profit: money(row.profit),
                      orders: format.number(row.orders),
                    },
                  }))}
                  footer={
                    data.branches.length > 1
                      ? {
                          branch: t.combined,
                          net: money(data.branches.reduce((sum, row) => sum + row.net, 0)),
                          profit: money(data.branches.reduce((sum, row) => sum + row.profit, 0)),
                          orders: format.number(data.branches.reduce((sum, row) => sum + row.orders, 0)),
                        }
                      : undefined
                  }
                />
              </Card>

              <Card
                title={t.brandComparison}
                actions={
                  <SegmentedControl<BrandMetric>
                    label={t.brandComparison}
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'net', label: t.netSales },
                      { value: 'profit', label: t.grossProfit },
                      { value: 'sellThrough', label: t.sellThrough },
                    ]}
                  />
                }
              >
                <Table
                  label={t.brandComparison}
                  emptyText={text.common.noResults}
                  columns={[
                    { key: 'brand', label: text.owner.fields.brand },
                    ...data.branches.map((row) => ({ key: row.branchId, label: format.branch(row.branchId), align: 'end' as const })),
                  ]}
                  rows={data.brandComparison.map((row) => ({
                    key: row.brandId,
                    cells: {
                      brand: format.brand(row.brandId),
                      ...Object.fromEntries(
                        data.branches.map((branch) => {
                          const cell = row.cells[branch.branchId];
                          return [branch.branchId, metric === 'sellThrough' ? format.percent(cell?.sellThrough ?? 0) : money(cell?.[metric] ?? 0)];
                        }),
                      ),
                    },
                  }))}
                />
              </Card>

              <Grid>
                <StatCard label={t.stockUnits} value={format.number(data.stock.units)} to={routes.owner.stock} />
                <StatCard label={t.stockAtCost} value={money(data.stock.costValue)} to={routes.owner.stock} />
                <StatCard label={t.stockAtPrice} value={money(data.stock.retailValue)} to={routes.owner.stock} />
                <StatCard label={t.pendingApprovals} value={format.number(data.pendingApprovals)} to={routes.owner.approvals} />
              </Grid>

              <div className={styles.split}>
                <Card title={t.topProducts}>
                  <BarList
                    label={t.topProducts}
                    items={data.topProducts.map((row) => ({ key: row.id, label: row.label, value: row.units, display: fillText(t.units, { count: format.number(row.units) }), detail: money(row.net), to: toPath(routes.owner.product, { productId: row.id }) }))}
                  />
                </Card>
                <Card title={t.slowProducts}>
                  <BarList
                    label={t.slowProducts}
                    color={vars.colors.warning}
                    items={data.slowProducts.map((row) => ({ key: row.id, label: row.label, value: row.units, display: fillText(t.units, { count: format.number(row.units) }), to: toPath(routes.owner.product, { productId: row.id }) }))}
                  />
                </Card>
                <Card title={t.mostProfitableBrands}>
                  <BarList
                    label={t.mostProfitableBrands}
                    items={data.brandsByProfit.slice(0, 5).map((row) => ({ key: row.id, label: row.label, value: row.profit, display: money(row.profit), detail: format.percent(marginPercent(row.profit, row.net)), to: toPath(routes.owner.brand, { brandId: row.id }) }))}
                  />
                </Card>
                <Card title={t.leastProfitableBrands}>
                  <BarList
                    label={t.leastProfitableBrands}
                    color={vars.colors.danger}
                    items={data.brandsByProfit.slice(-5).reverse().map((row) => ({ key: row.id, label: row.label, value: row.profit, display: money(row.profit), detail: format.percent(marginPercent(row.profit, row.net)), to: toPath(routes.owner.brand, { brandId: row.id }) }))}
                  />
                </Card>
              </div>
              <Text variant="caption" color={vars.colors.textMuted}>
                {fillText(t.footnote, { currency: data.currency })}{' '}
                <Link to={routes.owner.currencies}>{text.nav.currencies}</Link>
              </Text>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
