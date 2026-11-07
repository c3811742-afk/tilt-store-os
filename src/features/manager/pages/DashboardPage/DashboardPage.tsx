import { getBranchDashboard, type BranchDashboard, type BranchPeriod } from '@/shared/api';
import { AsyncContent, Card, ErrorBoundary, Grid, Notice, PageHeader, SegmentedControl, Stack, StatCard, Table, Text } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAsync, useBranchScope, useChange, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { branchPeriods } from '../../constants/periods';

// The branch manager's home: today's and this week's sales against the previous period, what needs attention,
// and the products that sell. Selling figures only; cost and profit never reach this screen.
export const DashboardPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const change = useChange();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [period, setPeriod] = useQueryState<BranchPeriod>('period', 'week');
  const state = useAsync(() => getBranchDashboard(branchId, period), [branchId, period, version]);
  const t = text.manager.dashboard;

  const attention = (data: BranchDashboard) =>
    [
      { key: 'approvals', count: data.attention.approvals, label: t.approvals, to: routes.manager.approvals },
      { key: 'lowStock', count: data.attention.lowStock, label: t.lowStock, to: withQuery(routes.manager.stock, { tab: 'low' }) },
      { key: 'arriving', count: data.attention.arriving, label: t.arriving, to: withQuery(routes.manager.transfers, { tab: 'incoming' }) },
      { key: 'openRegisters', count: data.attention.openRegisters, label: t.openRegisters, to: routes.manager.registers },
    ].filter((item) => item.count > 0);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <AsyncContent state={state}>
        {(data) => {
          const money = (amount: number) => format.money(amount, data.currency);
          const { today, week } = data;
          const items = attention(data);
          return (
            <Stack gap={vars.spacing[5]}>
              <ErrorBoundary>
                <Stack gap={vars.spacing[3]}>
                  <Text as="h2" variant="label" color={vars.colors.textMuted}>
                    {t.today}
                  </Text>
                  <Grid>
                    <StatCard label={t.sales} value={money(today.current.sales)} {...change(today.current.sales, today.previous.sales, { label: t.yesterday })} />
                    <StatCard label={t.returns} value={money(today.current.returns)} {...change(today.current.returns, today.previous.returns, { label: t.yesterday, lowerIsBetter: true })} />
                    <StatCard highlight label={t.net} value={money(today.current.net)} {...change(today.current.net, today.previous.net, { label: t.yesterday })} />
                    <StatCard label={t.orders} value={format.number(today.current.orders)} {...change(today.current.orders, today.previous.orders, { label: t.yesterday })} />
                  </Grid>
                  <Text as="h2" variant="label" color={vars.colors.textMuted}>
                    {t.week}
                  </Text>
                  <Grid>
                    <StatCard label={t.sales} value={money(week.current.sales)} {...change(week.current.sales, week.previous.sales, { label: t.lastWeek })} />
                    <StatCard label={t.returns} value={money(week.current.returns)} {...change(week.current.returns, week.previous.returns, { label: t.lastWeek, lowerIsBetter: true })} />
                    <StatCard label={t.net} value={money(week.current.net)} {...change(week.current.net, week.previous.net, { label: t.lastWeek })} />
                    <StatCard label={t.orders} value={format.number(week.current.orders)} {...change(week.current.orders, week.previous.orders, { label: t.lastWeek })} />
                  </Grid>
                </Stack>
              </ErrorBoundary>

              <ErrorBoundary>
                <Card title={t.attention}>
                  {items.length ? (
                    <Grid>
                      {items.map((item) => (
                        <Card key={item.key} to={item.to} background={vars.colors.surfaceMuted} borderColor={vars.colors.surfaceMuted}>
                          <Text variant="bodySm">{fillText(item.label, { count: format.number(item.count) })}</Text>
                        </Card>
                      ))}
                    </Grid>
                  ) : (
                    <Text variant="bodySm" color={vars.colors.textMuted}>
                      {t.allClear}
                    </Text>
                  )}
                </Card>
              </ErrorBoundary>

              <ErrorBoundary>
                <Card
                  title={t.products}
                  actions={<SegmentedControl<BranchPeriod> label={t.products} value={period} onChange={setPeriod} options={branchPeriods.map((value) => ({ value, label: t.periods[value] }))} />}
                >
                  <Text variant="caption" color={vars.colors.textMuted}>
                    {t.productsHint}
                  </Text>
                  {data.products.length ? (
                    <Table
                      label={t.products}
                      stackOnMobile
                      columns={[
                        { key: 'product', label: text.owner.fields.product },
                        { key: 'brand', label: text.owner.fields.brand },
                        { key: 'units', label: t.units, align: 'end' },
                        { key: 'unitShare', label: t.unitShare, align: 'end' },
                        { key: 'net', label: t.net, align: 'end' },
                        { key: 'netShare', label: t.netShare, align: 'end' },
                      ]}
                      rows={data.products.map((row) => ({
                        key: row.productId,
                        cells: {
                          product: (
                            <Text as="span" variant="bodySm" autoDirection>
                              {row.productName}
                            </Text>
                          ),
                          brand: format.brand(row.brandId),
                          units: format.number(row.units),
                          unitShare: format.percent(row.unitShare),
                          net: money(row.net),
                          netShare: format.percent(row.netShare),
                        },
                      }))}
                    />
                  ) : (
                    <Notice>{t.noSales}</Notice>
                  )}
                </Card>
              </ErrorBoundary>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
