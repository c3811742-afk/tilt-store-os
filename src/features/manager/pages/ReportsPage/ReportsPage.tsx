import { useState } from 'react';
import { getBranchDailySales, getBranchReturns, type BranchPeriod } from '@/shared/api';
import { AsyncContent, Badge, Grid, Notice, PageHeader, SegmentedControl, Stack, StatCard, Table, Tabs, Text, TextField } from '@/shared/components';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, presetRange, today } from '@/shared/utils';
import { branchPeriods } from '../../constants/periods';

type ReportsTab = 'sales' | 'returns';

// The branch's daily sales report (every completed sale of a day) and its returns and exchanges report.
export const ReportsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<ReportsTab>('tab', 'sales');
  const [day, setDay] = useState(today());
  const [period, setPeriod] = useState<BranchPeriod>('week');
  const range = presetRange(period);
  const sales = useAsync(() => getBranchDailySales(branchId, day), [branchId, day, version], () => false);
  const returns = useAsync(() => getBranchReturns(branchId, range), [branchId, range.from, range.to, version], () => false);
  const t = text.manager.reports;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<ReportsTab> label={t.title} value={tab} onChange={setTab} tabs={(['sales', 'returns'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        {tab === 'sales' && (
          <Stack gap={vars.spacing[4]}>
            <TextField label={t.day} type="date" value={day} max={today()} onChange={(value) => value && setDay(value)} width={vars.sizes.field.narrow} />
            <AsyncContent state={sales}>
              {(report) => {
                const money = (amount: number) => format.money(amount, report.currency);
                return (
                  <Stack gap={vars.spacing[4]}>
                    <Grid>
                      <StatCard label={t.sales} value={format.number(report.count)} />
                      <StatCard label={t.items} value={format.number(report.items)} />
                      <StatCard label={t.discount} value={money(report.discount)} />
                      <StatCard highlight label={t.total} value={money(report.total)} />
                    </Grid>
                    {report.rows.length ? (
                      <Table
                        label={t.tabs.sales}
                        stackOnMobile
                        columns={[
                          { key: 'time', label: t.time },
                          { key: 'sale', label: t.sale },
                          { key: 'cashier', label: t.cashier },
                          { key: 'items', label: t.items, align: 'end' },
                          { key: 'payment', label: t.payment },
                          { key: 'discount', label: t.discount, align: 'end' },
                          { key: 'total', label: t.total, align: 'end' },
                        ]}
                        rows={report.rows.map((row) => ({
                          key: row.id,
                          cells: {
                            time: format.dateTime(row.at),
                            sale: row.voided ? (
                              <Stack direction="row" gap={vars.spacing[2]} align="center">
                                <Text as="span" variant="bodySm" color={vars.colors.textMuted}>
                                  {row.number}
                                </Text>
                                <Badge>{t.voided}</Badge>
                              </Stack>
                            ) : (
                              row.number
                            ),
                            cashier: format.user(row.cashierId),
                            items: format.number(row.items),
                            payment: row.methodIds.map(format.payment).join(text.common.listSeparator),
                            discount: row.discount ? money(row.discount) : '',
                            total: money(row.total),
                          },
                        }))}
                        footer={{ time: text.common.total, items: format.number(report.items), discount: money(report.discount), total: money(report.total) }}
                      />
                    ) : (
                      <Notice>{t.noSales}</Notice>
                    )}
                  </Stack>
                );
              }}
            </AsyncContent>
          </Stack>
        )}
        {tab === 'returns' && (
          <Stack gap={vars.spacing[4]}>
            <SegmentedControl<BranchPeriod> label={t.period} value={period} onChange={setPeriod} options={branchPeriods.map((value) => ({ value, label: text.manager.dashboard.periods[value] }))} />
            <AsyncContent state={returns}>
              {(report) => {
                const money = (amount: number) => format.money(amount, report.currency);
                return (
                  <Stack gap={vars.spacing[4]}>
                    <Grid>
                      <StatCard label={t.returns} value={format.number(report.returns)} />
                      <StatCard label={t.exchanges} value={format.number(report.exchanges)} />
                      <StatCard label={t.items} value={format.number(report.pieces)} />
                      <StatCard label={t.refunded} value={money(report.refunded)} />
                    </Grid>
                    {report.rows.length ? (
                      <Table
                        label={t.tabs.returns}
                        stackOnMobile
                        columns={[
                          { key: 'when', label: text.common.when },
                          { key: 'kind', label: t.kind },
                          { key: 'sale', label: t.originalSale },
                          { key: 'items', label: text.staff.items.item },
                          { key: 'by', label: text.common.by },
                          { key: 'refund', label: t.refunded, align: 'end' },
                        ]}
                        rows={report.rows.map((row) => ({
                          key: row.id,
                          cells: {
                            when: format.dateTime(row.at),
                            kind: <Badge variant={row.kind === 'exchange' ? 'info' : 'neutral'}>{t.kinds[row.kind]}</Badge>,
                            sale: [row.saleNumber, row.exchangeSaleNumber && fillText(t.newSale, { number: row.exchangeSaleNumber })].filter(Boolean).join(' · '),
                            items: row.lines.map((line) => `${line.productName} · ${line.size} · ${line.color} × ${format.number(line.qty)} (${format.option(line.reasonId)})`).join(text.common.listSeparator),
                            by: format.user(row.byId),
                            refund: money(row.refund),
                          },
                        }))}
                      />
                    ) : (
                      <Notice>{t.noReturns}</Notice>
                    )}
                  </Stack>
                );
              }}
            </AsyncContent>
          </Stack>
        )}
      </Tabs>
    </Stack>
  );
};
