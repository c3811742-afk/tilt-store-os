import { useState } from 'react';
import { getDailyClosing, listRegisters } from '@/shared/api';
import { AsyncContent, Card, Grid, Notice, PageHeader, Stack, StatCard, Table, Tabs, TextField } from '@/shared/components';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { today } from '@/shared/utils';
import { RegisterCard } from './RegisterCard';

type RegistersTab = 'registers' | 'closing';

// The branch's registers (open and recently closed) and the daily closing report with totals per payment method.
export const RegistersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<RegistersTab>('tab', 'registers');
  const [day, setDay] = useState(today());
  const registers = useAsync(() => listRegisters(branchId), [branchId, version]);
  const closing = useAsync(() => getDailyClosing(branchId, day), [branchId, day, version], () => false);
  const t = text.manager.registers;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <Tabs<RegistersTab> label={t.title} value={tab} onChange={setTab} tabs={(['registers', 'closing'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        {tab === 'registers' && (
          <AsyncContent state={registers} empty={<Notice>{t.none}</Notice>}>
            {(views) => (
              <Stack gap={vars.spacing[3]}>
                {views.map((view) => (
                  <RegisterCard key={view.shift.id} view={view} />
                ))}
              </Stack>
            )}
          </AsyncContent>
        )}
        {tab === 'closing' && (
          <Stack gap={vars.spacing[4]}>
            <TextField label={t.day} type="date" value={day} max={today()} onChange={(value) => value && setDay(value)} width={vars.sizes.field.narrow} />
            <AsyncContent state={closing}>
              {(report) => {
                const money = (amount: number) => format.money(amount, report.currency);
                const taken = report.methods.reduce((sum, row) => sum + row.taken, 0);
                const refunded = report.methods.reduce((sum, row) => sum + row.refunded, 0);
                return (
                  <Stack gap={vars.spacing[4]}>
                    <Grid>
                      <StatCard label={t.sales} value={format.number(report.sales)} />
                      <StatCard label={t.taken} value={money(taken)} />
                      <StatCard label={t.refunded} value={money(refunded)} />
                      <StatCard highlight label={t.net} value={money(taken - refunded)} />
                    </Grid>
                    <Card title={t.method}>
                      {report.methods.length ? (
                        <Table
                          label={t.method}
                          stackOnMobile
                          columns={[
                            { key: 'method', label: t.method },
                            { key: 'payments', label: t.payments, align: 'end' },
                            { key: 'taken', label: t.taken, align: 'end' },
                            { key: 'refunded', label: t.refunded, align: 'end' },
                            { key: 'net', label: t.net, align: 'end' },
                          ]}
                          rows={report.methods.map((row) => ({
                            key: row.methodId,
                            cells: { method: format.payment(row.methodId), payments: format.number(row.payments), taken: money(row.taken), refunded: money(row.refunded), net: money(row.net) },
                          }))}
                          footer={{ method: text.common.total, taken: money(taken), refunded: money(refunded), net: money(taken - refunded) }}
                        />
                      ) : (
                        <Notice>{t.noSalesDay}</Notice>
                      )}
                    </Card>
                    {report.registers.length > 0 && (
                      <Card title={t.registersOfDay}>
                        <Table
                          label={t.registersOfDay}
                          stackOnMobile
                          columns={[
                            { key: 'register', label: t.register },
                            { key: 'expected', label: t.expected, align: 'end' },
                            { key: 'counted', label: t.counted, align: 'end' },
                            { key: 'difference', label: t.difference, align: 'end' },
                          ]}
                          rows={report.registers.map((view) => ({
                            key: view.shift.id,
                            cells: {
                              register: `${view.shift.register} · ${format.user(view.shift.cashierId)}`,
                              expected: money(view.expected),
                              counted: view.shift.countedCash === undefined ? t.open : money(view.shift.countedCash),
                              difference: view.difference === null ? '' : money(view.difference),
                            },
                          }))}
                        />
                      </Card>
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
