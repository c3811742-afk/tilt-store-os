import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { createStatement, getBrandPayouts, getBrandSales, recordBrandPayment, recordFeePayment } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, DetailList, Grid, Notice, PageHeader, SelectField, Stack, StatCard, Table, Tabs, Text, TextField } from '@/shared/components';
import { brandPaymentMethods, feeStateTone, routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import type { BrandPaymentMethod } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, today } from '@/shared/utils';
import { PeriodFilter } from '../../components';
import { usePeriod } from '../../hooks';
import { useStatementRows } from '../../hooks/useStatementRows';

type PayoutTab = 'statements' | 'payments' | 'fees' | 'sales';

// One brand's statements, payments, monthly fees and the commission on each sale.
export const BrandPayoutsPage = () => {
  const { brandId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getBrandPayouts(brandId), [brandId, version]);
  const [tab, setTab] = useQueryState<PayoutTab>('tab', 'statements');
  const period = usePeriod('last30');
  const sales = useAsync(() => (tab === 'sales' ? getBrandSales(brandId, period.range) : Promise.resolve(null)), [brandId, tab, period.range.from, period.range.to, version], () => false);
  const action = useAction();
  const statementRows = useStatementRows();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [payment, setPayment] = useState({ date: today(), amount: '', method: 'bank' as BrandPaymentMethod, reference: '', statementId: '' });
  const t = text.owner.payouts;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const money = (amount: number) => format.money(amount, data.unsettled.currency);
        const period2 = range ?? { from: data.unsettled.range.from === '2000-01-01' ? data.brand.contractStart : data.unsettled.range.from, to: today() };
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader back={{ to: routes.owner.payouts, label: t.title }} title={data.brand.name} subtitle={fillText(t.paidIn, { frequency: text.owner.brands.terms.frequencies[data.terms.payoutFrequency], currency: data.terms.payoutCurrency })} />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            <Grid>
              <StatCard label={t.notOnStatement} value={money(data.unsettled.totals.amountDue)} highlight detail={fillText(t.sinceDate, { date: format.date(period2.from) })} />
              <StatCard label={t.totals.sold} value={format.number(data.unsettled.totals.soldUnits)} detail={money(data.unsettled.totals.sales)} />
              <StatCard label={t.totals.commission} value={money(data.unsettled.totals.commission)} />
            </Grid>
            <Tabs<PayoutTab> label={data.brand.name} value={tab} onChange={setTab} tabs={(['statements', 'payments', 'fees', 'sales'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
              {tab === 'statements' && (
                <Stack gap={vars.spacing[4]}>
                  <Card title={t.generate}>
                    <Text variant="bodySm" color={vars.colors.textMuted}>
                      {t.generateHint}
                    </Text>
                    <Stack direction="row" wrap align="flex-end" gap={vars.spacing[3]}>
                      <TextField label={text.common.from} type="date" value={period2.from} onChange={(from) => setRange({ ...period2, from })} width={vars.sizes.field.narrow} />
                      <TextField label={text.common.to} type="date" value={period2.to} min={period2.from} onChange={(to) => setRange({ ...period2, to })} width={vars.sizes.field.narrow} />
                      <Button
                        disabled={Boolean(action.busy) || period2.to < period2.from}
                        onClick={async () => {
                          const statement = await action.run('generate', () => createStatement(brandId, period2));
                          if (statement) navigate(toPath(routes.owner.statement, { statementId: statement.id }));
                        }}
                      >
                        {t.generate}
                      </Button>
                    </Stack>
                  </Card>
                  <Table
                    label={t.tabs.statements}
                    emptyText={t.noStatements}
                    columns={[
                      { key: 'number', label: t.statement },
                      { key: 'period', label: t.period },
                      { key: 'due', label: t.totals.amountDue, align: 'end' },
                      { key: 'paid', label: t.paid, align: 'end' },
                      { key: 'status', label: text.common.status },
                    ]}
                    rows={data.statements.map(({ statement, paid }) => ({
                      key: statement.id,
                      onClick: () => navigate(toPath(routes.owner.statement, { statementId: statement.id })),
                      cells: {
                        number: <Link to={toPath(routes.owner.statement, { statementId: statement.id })}>{statement.number}</Link>,
                        period: `${format.date(statement.periodStart)} – ${format.date(statement.periodEnd)}`,
                        due: format.money(statement.totals.amountDue, statement.currency),
                        paid: format.money(paid, statement.currency),
                        status: (
                          <Stack direction="row" gap={vars.spacing[1]}>
                            <Badge variant={statement.status === 'paid' ? 'success' : statement.status === 'approved' ? 'info' : 'warning'}>{t.states[statement.status]}</Badge>
                            {statement.locked && <Badge>{t.locked}</Badge>}
                          </Stack>
                        ),
                      },
                    }))}
                  />
                </Stack>
              )}
              {tab === 'payments' && (
                <Stack gap={vars.spacing[4]}>
                  <Card title={t.recordPayment}>
                    <Grid minColumnWidth={vars.sizes.field.narrow}>
                      <TextField label={text.common.date} type="date" value={payment.date} onChange={(date) => setPayment({ ...payment, date })} />
                      <TextField label={text.common.amount} type="number" min={0} prefix={data.terms.payoutCurrency} value={payment.amount} onChange={(amount) => setPayment({ ...payment, amount })} />
                      <SelectField label={t.method} value={payment.method} onChange={(method) => setPayment({ ...payment, method })} options={brandPaymentMethods.map((method) => ({ value: method, label: t.methods[method] }))} />
                      <TextField label={t.reference} value={payment.reference} onChange={(reference) => setPayment({ ...payment, reference })} />
                      <SelectField
                        label={t.statement}
                        placeholder={text.common.none}
                        value={payment.statementId}
                        onChange={(statementId) => {
                          const chosen = data.statements.find((row) => row.statement.id === statementId);
                          setPayment({ ...payment, statementId, amount: chosen ? String(Math.max(chosen.statement.totals.amountDue - chosen.paid, 0).toFixed(2)) : payment.amount });
                        }}
                        options={data.statements.filter(({ statement }) => statement.status === 'approved').map(({ statement }) => ({ value: statement.id, label: `${statement.number} · ${format.money(statement.totals.amountDue, statement.currency)}` }))}
                      />
                    </Grid>
                    <Stack direction="row" justify="flex-end">
                      <Button
                        disabled={!(Number(payment.amount) > 0) || Boolean(action.busy)}
                        onClick={async () => {
                          const done = await action.run('pay', () =>
                            recordBrandPayment({ brandId, date: payment.date, amount: Number(payment.amount), currency: data.terms.payoutCurrency, method: payment.method, reference: payment.reference, statementId: payment.statementId || undefined }),
                          );
                          if (done) setPayment({ date: today(), amount: '', method: 'bank', reference: '', statementId: '' });
                        }}
                      >
                        {t.recordPayment}
                      </Button>
                    </Stack>
                  </Card>
                  <Table
                    label={t.tabs.payments}
                    emptyText={t.noPayments}
                    columns={[
                      { key: 'date', label: text.common.date },
                      { key: 'amount', label: text.common.amount, align: 'end' },
                      { key: 'method', label: t.method },
                      { key: 'reference', label: t.reference },
                      { key: 'statement', label: t.statement },
                      { key: 'by', label: text.common.by },
                    ]}
                    rows={data.payments.map((row) => ({
                      key: row.id,
                      cells: {
                        date: format.date(row.date),
                        amount: format.money(row.amount, row.currency),
                        method: t.methods[row.method],
                        reference: row.reference,
                        statement: data.statements.find(({ statement }) => statement.id === row.statementId)?.statement.number ?? '',
                        by: format.user(row.byId),
                      },
                    }))}
                  />
                </Stack>
              )}
              {tab === 'fees' && (
                <Stack gap={vars.spacing[3]}>
                  <DetailList
                    items={[
                      { key: 'fee', label: text.owner.brands.terms.monthlyFee, value: data.terms.monthlyFee ? format.money(data.terms.monthlyFee, data.terms.feeCurrency) : text.common.none },
                      { key: 'how', label: t.collected, value: data.terms.deductFeeFromPayout ? text.owner.brands.terms.feeDeducted : text.owner.brands.terms.feeCollected },
                    ]}
                  />
                  <Table
                    label={t.tabs.fees}
                    emptyText={t.noFees}
                    columns={[
                      { key: 'month', label: t.month },
                      { key: 'amount', label: text.common.amount, align: 'end' },
                      { key: 'due', label: t.dueDate },
                      { key: 'state', label: text.common.status },
                      { key: 'actions', label: '', align: 'end' },
                    ]}
                    rows={data.fees.map(({ fee, state: feeState, dueDate }) => ({
                      key: fee.id,
                      cells: {
                        month: format.month(fee.month),
                        amount: format.money(fee.amount, fee.currency),
                        due: format.date(dueDate),
                        state: <Badge variant={feeStateTone[feeState]}>{fee.deductedInStatementId ? t.feeDeducted : t.feeStates[feeState]}</Badge>,
                        actions:
                          feeState === 'due' || feeState === 'overdue' ? (
                            <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(fee.id, () => recordFeePayment(fee.id))}>
                              {t.markPaid}
                            </Button>
                          ) : null,
                      },
                    }))}
                  />
                </Stack>
              )}
              {tab === 'sales' && (
                <Stack gap={vars.spacing[4]}>
                  <PeriodFilter period={period} />
                  <AsyncContent state={sales} empty={<Notice>{text.common.noResults}</Notice>}>
                    {(result) =>
                      result && (
                        <Table
                          label={t.tabs.sales}
                          columns={[
                            { key: 'when', label: text.common.when },
                            { key: 'sale', label: t.sale },
                            { key: 'branch', label: text.owner.fields.branch },
                            { key: 'qty', label: text.common.quantity, align: 'end' },
                            { key: 'sales', label: t.totals.sold, align: 'end' },
                            { key: 'commission', label: t.totals.commission, align: 'end' },
                            { key: 'payout', label: t.toBrand, align: 'end' },
                          ]}
                          rows={result.items.map((item) => ({
                            key: item.key,
                            cells: {
                              when: format.dateTime(item.at),
                              sale: `${item.saleNumber}${item.kind === 'return' ? ` · ${t.returnLabel}` : ''}`,
                              branch: format.branch(item.branchId),
                              qty: format.number(item.qty),
                              sales: format.money(item.sales, item.currency),
                              commission: format.money(item.commission, item.currency),
                              payout: format.money(item.payoutConverted, result.currency),
                            },
                          }))}
                          footer={{
                            when: text.common.total,
                            qty: format.number(result.items.reduce((sum, item) => sum + item.qty, 0)),
                            commission: format.money(result.items.reduce((sum, item) => sum + item.commission * item.rate, 0), result.currency),
                            payout: format.money(result.items.reduce((sum, item) => sum + item.payoutConverted, 0), result.currency),
                          }}
                        />
                      )
                    }
                  </AsyncContent>
                </Stack>
              )}
            </Tabs>
            <Card title={t.openNow}>
              <DetailList items={statementRows(data.unsettled.totals, data.unsettled.currency).map((row) => ({ key: row.key, label: row.label, value: row.value }))} />
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
