import { useParams } from 'react-router';
import { decideStatement, deleteDraftStatement, getStatement, lockStatement } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Icon, Notice, PageHeader, Stack, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { ExportButtons } from '../../components';
import { useStatementRows } from '../../hooks/useStatementRows';
import styles from './StatementPage.module.css';

// A payout statement: its totals, every sale and return behind them (for disputes), approval, payment and locking.
export const StatementPage = () => {
  const { statementId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getStatement(statementId), [statementId, version]);
  const action = useAction();
  const statementRows = useStatementRows();
  const t = text.owner.payouts;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const { statement, brand } = data;
        const rows = statementRows(statement.totals, statement.currency);
        const title = `${brand.name} · ${statement.number}`;
        const period = `${format.date(statement.periodStart)} – ${format.date(statement.periodEnd)}`;
        const whatsapp = `https://wa.me/${brand.phone.replace(/\D/g, '')}?text=${encodeURIComponent([title, period, ...rows.map((row) => `${row.label}: ${row.value}`)].join('\n'))}`;
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: toPath(routes.owner.brandPayouts, { brandId: brand.id }), label: brand.name }}
              title={title}
              subtitle={period}
              actions={
                <>
                  <Badge variant={statement.status === 'paid' ? 'success' : statement.status === 'approved' ? 'info' : 'warning'}>{t.states[statement.status]}</Badge>
                  {statement.locked && <Badge>{t.locked}</Badge>}
                </>
              }
            />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {statement.status === 'draft' && (
              <Notice
                tone="warning"
                title={t.approveTitle}
                action={
                  <Stack direction="row" gap={vars.spacing[2]}>
                    <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run('approve', () => decideStatement(statement.id, true))}>
                      {text.common.approve}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('delete', () => deleteDraftStatement(statement.id))}>
                      {text.common.delete}
                    </Button>
                  </Stack>
                }
              >
                {t.approveHint}
              </Notice>
            )}
            {statement.status === 'approved' && <Notice tone="info">{fillText(t.awaitingPayment, { paid: format.money(data.paid, statement.currency) })}</Notice>}
            <Card
              title={t.summary}
              actions={
                <>
                  <ExportButtons
                    title={title}
                    subtitle={period}
                    tables={() => [
                      { title: t.summary, headers: [text.common.details, text.common.amount], rows: rows.map((row) => [row.label, Math.round(row.amount * 100) / 100]) },
                      {
                        title: t.items,
                        headers: [text.common.date, t.sale, text.owner.fields.branch, text.owner.fields.product, text.common.quantity, text.common.currency, t.totals.sold, t.totals.commission, t.rate, fillText(t.inCurrency, { currency: statement.currency })],
                        rows: data.items.map((item) => [format.date(item.at), item.saleNumber, format.branch(item.branchId), `${item.productName} ${item.variantLabel}`, item.qty, item.currency, Math.round(item.sales * 100) / 100, Math.round(item.commission * 100) / 100, Math.round(item.rate * 10000) / 10000, Math.round(item.payoutConverted * 100) / 100]),
                      },
                    ]}
                  />
                  <a className={styles.whatsapp} href={whatsapp} target="_blank" rel="noreferrer">
                    <Icon name="message" />
                    {t.sendWhatsapp}
                  </a>
                </>
              }
            >
              <ul className={styles.rows}>
                {rows.map((row) => (
                  <li key={row.key} className={row.strong ? styles.strong : styles.row}>
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </li>
                ))}
              </ul>
              {statement.status !== 'draft' && !statement.locked && (
                <Stack direction="row">
                  <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('lock', () => lockStatement(statement.id))}>
                    <Icon name="lock" />
                    {t.lock}
                  </Button>
                </Stack>
              )}
            </Card>
            <Card title={t.items}>
              <Table
                label={t.items}
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'sale', label: t.sale },
                  { key: 'kind', label: text.common.status },
                  { key: 'branch', label: text.owner.fields.branch },
                  { key: 'item', label: text.owner.fields.product },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                  { key: 'sales', label: t.totals.sold, align: 'end' },
                  { key: 'commission', label: t.totals.commission, align: 'end' },
                  { key: 'rate', label: t.rate, align: 'end' },
                  { key: 'payout', label: fillText(t.inCurrency, { currency: statement.currency }), align: 'end' },
                ]}
                rows={data.items.map((item) => ({
                  key: item.key,
                  values: { when: item.at },
                  cells: {
                    when: format.dateTime(item.at),
                    sale: item.saleNumber,
                    kind: item.kind === 'return' ? <Badge variant="warning">{item.carried ? t.returnAfterPayment : t.returnLabel}</Badge> : '',
                    branch: format.branch(item.branchId),
                    item: `${item.productName} · ${item.variantLabel}`,
                    qty: format.number(item.qty),
                    sales: format.money(item.sales, item.currency),
                    commission: format.money(item.commission, item.currency),
                    rate: item.currency === statement.currency ? '1' : format.number(Math.round(item.rate * 10000) / 10000),
                    payout: format.money(item.payoutConverted, statement.currency),
                  },
                }))}
              />
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
