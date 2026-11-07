import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createReturn, quoteSale, sendToCardMachine, type ApprovalInput, type CartItemInput, type ReturnableSale, type ReturnBlock, type TillPayment } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, SegmentedControl, SelectField, Stack, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLocale, useReference, useWorkBranch } from '@/shared/hooks';
import type { ReturnCondition } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, roundMoney } from '@/shared/utils';
import { ApprovalModal } from '../../components/ApprovalModal';
import { PaymentModal } from '../../components/PaymentModal';
import { QtyStepper } from '../../components/QtyStepper';
import { ExchangeItems } from './ExchangeItems';
import styles from '../../components/counter.module.css';

interface LineChoice {
  qty: number;
  reasonId: string;
  condition: ReturnCondition;
  defectOrigin?: 'received' | 'store';
  defectReasonId?: string;
}

type Mode = 'return' | 'exchange';


// What comes back from one sale and how the customer is paid back: a refund (to the original method or another the
// policy allows, card refunds through the card machine, or store credit), or an exchange linked to this sale.
export const ReturnForm = ({ sale, onBack }: { sale: ReturnableSale; onBack: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { settings } = useReference();
  const { branch } = useWorkBranch();
  const branchId = branch?.id ?? '';
  const t = text.cashier.returns;
  const action = useAction();
  const [mode, setMode] = useState<Mode>('return');
  const [choices, setChoices] = useState<Record<string, LineChoice>>({});
  const [approvalIds, setApprovalIds] = useState<string[]>([]);
  const [asking, setAsking] = useState<{ request: ApprovalInput; why: string; pendingId?: string } | null>(null);
  const [methodId, setMethodId] = useState(sale.refundMethodIds.find((id) => sale.paidWith.includes(id)) ?? sale.refundMethodIds[0] ?? '');
  const [cardCode, setCardCode] = useState('');
  const [machine, setMachine] = useState<'idle' | 'waiting' | 'declined'>('idle');
  const [newItems, setNewItems] = useState<CartItemInput[]>([]);
  const [keepAsCredit, setKeepAsCredit] = useState(true);
  const [paying, setPaying] = useState(false);
  const [tried, setTried] = useState(false);
  const money = (amount: number) => format.money(amount, sale.currency);
  const choiceOf = (lineId: string): LineChoice => choices[lineId] ?? { qty: 0, reasonId: '', condition: 'available' };
  const setChoice = (lineId: string, change: Partial<LineChoice>) => setChoices((current) => ({ ...current, [lineId]: { ...choiceOf(lineId), ...change } }));

  const chosen = sale.lines.filter((line) => choiceOf(line.lineId).qty > 0);
  const value = roundMoney(chosen.reduce((sum, line) => sum + line.paidPerPiece * choiceOf(line.lineId).qty, 0));
  const blocks = [...new Set(chosen.flatMap((line) => line.blocks).filter((block) => !(block === 'saleItem' && mode === 'exchange')))] as ReturnBlock[];
  const missingReasons = chosen.some((line) => {
    const choice = choiceOf(line.lineId);
    return !choice.reasonId || (choice.condition === 'defective' && (!choice.defectOrigin || !choice.defectReasonId));
  });
  const has = (kind: 'returnOutsidePolicy' | 'refund') => approvalIds.some((id) => id.startsWith(`${kind}:`));
  const policyOk = !blocks.length || has('returnOutsidePolicy');

  const quote = useAsync(() => quoteSale({ branchId, items: newItems }), [branchId, JSON.stringify(newItems)]);
  const newTotal = mode === 'exchange' && quote.status === 'success' ? quote.data.total : 0;
  const difference = roundMoney(newTotal - value); // > 0: the customer pays; < 0: the customer gets money back
  const refundAmount = mode === 'return' ? value : difference < 0 && !keepAsCredit ? -difference : 0;
  const refundMethod = settings.paymentMethods.find((method) => method.id === methodId);
  const cashTooHigh = refundMethod?.kind === 'cash' && refundAmount > settings.refundApprovalAbove && !has('refund');
  const cardPending = refundMethod?.kind === 'card' && refundAmount > 0 && !cardCode;
  const ready = chosen.length > 0 && !missingReasons && policyOk && !cashTooHigh && !cardPending && (mode === 'return' || newItems.length > 0);

  const ask = (kind: 'returnOutsidePolicy' | 'refund') =>
    setAsking({
      request: {
        branchId,
        kind,
        level: 'manager',
        amount: kind === 'refund' ? refundAmount : value,
        currency: sale.currency,
        summary: kind === 'refund' ? fillText(text.cashier.approval.summaryRefund, { amount: money(refundAmount), number: sale.number }) : fillText(text.cashier.approval.summaryPolicy, { number: sale.number }),
      },
      why: kind === 'refund' ? fillText(text.cashier.approval.refundWhy, { amount: money(refundAmount), limit: money(settings.refundApprovalAbove) }) : fillText(text.cashier.approval.policyWhy, { why: blocks.map((block) => t.blocks[block]).join(text.common.listSeparator) }),
    });

  const refunds = (): TillPayment[] => (refundAmount > 0 ? [{ methodId, amount: refundAmount, reference: cardCode || undefined }] : []);

  const complete = (payments: TillPayment[] = []) =>
    action.run('complete', async () => {
      const saleReturn = await createReturn({
        branchId,
        saleId: sale.saleId,
        kind: mode,
        lines: chosen.map((line) => ({ lineId: line.lineId, ...choiceOf(line.lineId) })),
        refunds: refunds(),
        approvalIds: approvalIds.map((id) => id.split(':')[1]),
        exchange: mode === 'exchange' ? { items: newItems, payments, keepAsCredit } : undefined,
      });
      navigate(toPath(routes.cashier.receipt, { saleId: saleReturn.id }));
    });

  const sendToCard = async () => {
    setMachine('waiting');
    const result = await sendToCardMachine(refundAmount);
    if (result.approved) {
      setCardCode(result.reference);
      setMachine('idle');
    } else setMachine('declined');
  };

  const refundChoice = (
    <Stack gap={vars.spacing[3]}>
      <SelectField
        label={t.refundTo}
        value={methodId}
        onChange={(next) => {
          setMethodId(next);
          setCardCode('');
          setMachine('idle');
        }}
        options={sale.refundMethodIds.map((id) => ({ value: id, label: format.payment(id) }))}
        width={vars.sizes.field.maxWidth}
      />
      {methodId === 'pm-credit' && sale.customer && <Text variant="caption" color={vars.colors.textMuted}>{fillText(t.creditBalance, { amount: money(sale.customer.storeCredit) })}</Text>}
      {cashTooHigh && (
        <Notice tone="warning" action={<Button size="sm" variant="secondary" onClick={() => ask('refund')}>{t.askManager}</Button>}>
          {fillText(text.cashier.approval.refundWhy, { amount: money(refundAmount), limit: money(settings.refundApprovalAbove) })}
        </Notice>
      )}
      {refundMethod?.kind === 'card' && refundAmount > 0 && (
        <Stack gap={vars.spacing[2]}>
          {cardCode ? (
            <Notice tone="success">{fillText(t.refundDone, { code: cardCode })}</Notice>
          ) : (
            <>
              {machine === 'waiting' && <Notice tone="info">{text.cashier.payment.waitingMachine}</Notice>}
              {machine === 'declined' && <Notice tone="danger">{text.cashier.payment.declines.noConnection}</Notice>}
              <div>
                <Button variant="secondary" disabled={machine === 'waiting'} onClick={() => void sendToCard()}>
                  {machine === 'declined' ? text.cashier.payment.retry : fillText(t.sendToMachine, { amount: money(refundAmount) })}
                </Button>
              </div>
            </>
          )}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Stack gap={vars.spacing[4]}>
      <Card
        title={fillText(t.sale, { number: sale.number })}
        actions={
          <Button size="sm" variant="secondary" onClick={onBack}>
            {text.common.back}
          </Button>
        }
      >
        <Text variant="bodySm" color={vars.colors.textSecondary}>
          {fillText(t.soldAt, { branch: sale.branchName, date: format.dateTime(sale.at) })}
          {sale.customer ? ` · ${sale.customer.name} · ${sale.customer.phone}` : ''}
        </Text>
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.days, { days: format.number(sale.daysSince), window: format.number(sale.windowDays) })}
        </Text>
        {sale.chain.length > 1 && (
          <Text variant="caption" color={vars.colors.textMuted}>
            {t.chain}: {sale.chain.map((link) => `${t.chainKinds[link.kind]} ${link.number}`).join(' → ')}
          </Text>
        )}
        {sale.branchId !== branchId && <Notice tone="info">{fillText(t.fromOtherBranch, { branch: sale.branchName })}</Notice>}
        {sale.outsideWindow && <Notice tone="warning">{fillText(t.outside, { window: format.number(sale.windowDays) })}</Notice>}
        <SegmentedControl<Mode>
          label={t.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'return', label: t.modes.return },
            { value: 'exchange', label: t.modes.exchange },
          ]}
        />
      </Card>

      <Card>
        <Table
          label={t.title}
          stackOnMobile
          columns={[
            { key: 'item', label: t.item },
            { key: 'bought', label: t.bought, align: 'end' },
            { key: 'paid', label: t.paid, align: 'end' },
            { key: 'qty', label: t.returnQty },
            { key: 'how', label: `${t.reason} · ${t.condition}` },
          ]}
          rows={sale.lines.map((line) => {
            const choice = choiceOf(line.lineId);
            const reasonMissing = tried && choice.qty > 0 && !choice.reasonId;
            return {
              key: line.lineId,
              cells: {
                item: (
                  <Stack gap={vars.spacing[1]}>
                    <Text as="span" variant="bodySm" autoDirection>
                      {line.name}
                    </Text>
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>
                      {line.size} · {line.color} · {line.sku}
                    </Text>
                    {line.promotionName && (
                      <Text as="span" variant="caption" color={vars.colors.success}>
                        {line.promotionName}
                      </Text>
                    )}
                    {line.blocks.filter((block) => !(block === 'saleItem' && mode === 'exchange')).map((block) => (
                      <span key={block}>
                        <Badge variant="warning">{t.blocks[block]}</Badge>
                      </span>
                    ))}
                  </Stack>
                ),
                bought: `${format.number(line.bought)}${line.returned ? ` (${t.alreadyReturned} ${format.number(line.returned)})` : ''}`,
                paid: money(line.paidPerPiece),
                qty: line.left > 0 ? <QtyStepper value={choice.qty} min={0} max={line.left} onChange={(qty) => setChoice(line.lineId, { qty })} /> : <Text as="span" variant="caption" color={vars.colors.textMuted}>{t.alreadyReturned}</Text>,
                how:
                  choice.qty > 0 ? (
                    <Stack gap={vars.spacing[2]}>
                      <SelectField
                        label={t.reason}
                        placeholder={text.common.required}
                        value={choice.reasonId}
                        onChange={(reasonId) => setChoice(line.lineId, { reasonId })}
                        options={settings.lists.returnReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
                        error={reasonMissing ? text.validation.required : undefined}
                      />
                      <SelectField<ReturnCondition>
                        label={t.condition}
                        value={choice.condition}
                        onChange={(condition) => setChoice(line.lineId, { condition })}
                        options={(['available', 'defective', 'toReturn'] as const).map((condition) => ({ value: condition, label: t.conditions[condition] }))}
                      />
                      {choice.condition === 'defective' && (
                        <>
                          <SelectField
                            label={t.defectOrigin}
                            placeholder={text.common.required}
                            value={choice.defectOrigin ?? ''}
                            onChange={(origin) => setChoice(line.lineId, { defectOrigin: origin as LineChoice['defectOrigin'] })}
                            options={(['received', 'store'] as const).map((origin) => ({ value: origin, label: text.cashier.defect.origins[origin] }))}
                            error={tried && !choice.defectOrigin ? text.validation.required : undefined}
                          />
                          <SelectField
                            label={t.defectReason}
                            placeholder={text.common.required}
                            value={choice.defectReasonId ?? ''}
                            onChange={(defectReasonId) => setChoice(line.lineId, { defectReasonId })}
                            options={settings.lists.defectReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
                            error={tried && !choice.defectReasonId ? text.validation.required : undefined}
                          />
                        </>
                      )}
                    </Stack>
                  ) : null,
              },
            };
          })}
        />
        {!chosen.length && (
          <Text variant="caption" color={vars.colors.textMuted}>
            {t.nothingSelected}
          </Text>
        )}
        {blocks.length > 0 && (
          <Notice
            tone={has('returnOutsidePolicy') ? 'success' : 'warning'}
            action={!has('returnOutsidePolicy') && <Button size="sm" variant="secondary" onClick={() => ask('returnOutsidePolicy')}>{t.askManager}</Button>}
          >
            {has('returnOutsidePolicy') ? t.approvedOutside : fillText(text.cashier.approval.policyWhy, { why: blocks.map((block) => t.blocks[block]).join(text.common.listSeparator) })}
          </Notice>
        )}
      </Card>

      {mode === 'exchange' && (
        <Card title={t.newItems}>
          <ExchangeItems items={newItems} onChange={setNewItems} />
          <AsyncContent state={quote} loading={null} empty={null}>
            {(current) => (
              <div className={styles.totals}>
                <div className={styles.row}>
                  <span className={styles.muted}>{t.returnedValue}</span>
                  <span>{money(value)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.muted}>{t.newTotal}</span>
                  <span>{money(current.total)}</span>
                </div>
                <div className={`${styles.row} ${styles.totalRow}`}>
                  <span>{difference === 0 ? t.evenExchange : difference > 0 ? fillText(t.customerPays, { amount: money(difference) }) : fillText(t.customerGets, { amount: money(-difference) })}</span>
                </div>
              </div>
            )}
          </AsyncContent>
          {newItems.length > 0 && difference < 0 && (
            <Stack gap={vars.spacing[3]}>
              <SegmentedControl<'credit' | 'refund'>
                label={t.refundTo}
                value={keepAsCredit ? 'credit' : 'refund'}
                onChange={(next) => setKeepAsCredit(next === 'credit')}
                options={[
                  { value: 'credit', label: t.keepCredit },
                  { value: 'refund', label: t.refundIt },
                ]}
              />
              {!keepAsCredit && refundChoice}
            </Stack>
          )}
        </Card>
      )}

      {mode === 'return' && chosen.length > 0 && (
        <Card title={`${t.refundTotal}: ${money(value)}`}>
          {refundChoice}
        </Card>
      )}

      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {tried && missingReasons && <Notice tone="warning">{t.reasonsNeeded}</Notice>}
      <div>
        <Button
          size="lg"
          disabled={Boolean(action.busy) || (tried && !ready)}
          onClick={() => {
            setTried(true);
            if (!ready) return;
            if (mode === 'exchange' && difference > 0) setPaying(true);
            else void complete();
          }}
        >
          {mode === 'exchange' ? t.completeExchange : t.complete}
        </Button>
      </div>

      <ApprovalModal
        request={asking?.request ?? null}
        why={asking?.why}
        pendingId={asking?.pendingId}
        onApproved={(approvalId) => {
          if (asking) setApprovalIds((current) => [...current, `${asking.request.kind}:${approvalId}`]);
          setAsking(null);
        }}
        onSent={(approvalId) => asking && setAsking({ ...asking, pendingId: approvalId })}
        onClose={() => setAsking(null)}
      />

      {paying && branch && (
        <PaymentModal
          open
          due={difference}
          currency={sale.currency}
          methodIds={branch.paymentMethodIds}
          storeCredit={sale.customer?.storeCredit ?? 0}
          completeLabel={t.completeExchange}
          busy={action.busy === 'complete'}
          error={action.error ? errorMessage(action.error) : undefined}
          onComplete={(payments) => void complete(payments)}
          onClose={() => setPaying(false)}
        />
      )}
    </Stack>
  );
};
