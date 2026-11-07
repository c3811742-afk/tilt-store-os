import { useState } from 'react';
import { sendToCardMachine, type CardResult, type TillPayment } from '@/shared/api';
import { Button, Modal, Notice, SegmentedControl, Stack, Text, TextField } from '@/shared/components';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import type { Id } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, roundMoney } from '@/shared/utils';
import styles from './counter.module.css';

interface PaymentModalProps {
  open: boolean;
  due: number;
  currency: string;
  methodIds: Id[]; // the branch's payment methods
  storeCredit: number; // the customer's balance
  startWith?: Id; // the method chosen on the counter (Cash, Card)
  busy?: boolean;
  error?: string;
  title?: string;
  completeLabel?: string;
  onComplete: (payments: TillPayment[]) => void;
  onClose: () => void;
}


// Taking payment: cash with the change to give, card through the card machine, InstaPay or wallet with a reference,
// store credit, or several of them (split). The sale can only be completed once it is fully paid.
export const PaymentModal = ({ open, due, currency, methodIds, storeCredit, startWith, busy, error, title, completeLabel, onComplete, onClose }: PaymentModalProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const t = text.cashier.payment;
  const methods = settings.paymentMethods.filter((method) => method.active && methodIds.includes(method.id) && method.kind !== 'cod');
  const [payments, setPayments] = useState<TillPayment[]>([]);
  const [methodId, setMethodId] = useState<Id>(startWith ?? methods[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  const [machine, setMachine] = useState<'idle' | 'waiting' | CardResult>('idle');
  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const left = roundMoney(due - paid);
  const method = methods.find((current) => current.id === methodId);
  const value = amount === '' ? left : Math.min(Number(amount), left);
  const creditLeft = roundMoney(storeCredit - payments.filter((payment) => payment.methodId === 'pm-credit').reduce((sum, payment) => sum + payment.amount, 0));
  const change = method?.kind === 'cash' && received !== '' ? roundMoney(Number(received) - value) : 0;

  const add = (payment: TillPayment) => {
    setPayments((current) => [...current, payment]);
    setAmount('');
    setReceived('');
    setReference('');
    setMachine('idle');
  };

  const canAdd =
    value > 0 &&
    (method?.kind !== 'cash' || received === '' || Number(received) >= value) &&
    ((method?.kind !== 'instapay' && method?.kind !== 'wallet') || reference.trim() !== '') &&
    (method?.kind !== 'storeCredit' || value <= creditLeft + 0.001);

  const sendToMachine = async () => {
    setMachine('waiting');
    const result = await sendToCardMachine(value);
    setMachine(result);
    if (result.approved) add({ methodId, amount: value, reference: result.reference });
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title ?? t.title} width={vars.sizes.modal.width}>
      <Stack gap={vars.spacing[4]}>
        <div className={styles.totals}>
          <div className={styles.row}>
            <span className={styles.muted}>{t.due}</span>
            <span>{format.money(due, currency)}</span>
          </div>
          {payments.map((payment, position) => (
            <div key={position} className={styles.row}>
              <span>
                {format.payment(payment.methodId)}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </span>
              <span>
                {format.money(payment.amount, currency)}{' '}
                <button type="button" className={styles.linkButton} onClick={() => setPayments((current) => current.filter((_, index) => index !== position))} disabled={busy}>
                  {text.common.remove}
                </button>
              </span>
            </div>
          ))}
          <div className={`${styles.row} ${styles.totalRow}`}>
            <span>{t.left}</span>
            <span>{format.money(left, currency)}</span>
          </div>
        </div>

        {left > 0 && (
          <Stack gap={vars.spacing[3]}>
            <SegmentedControl
              label={t.method}
              value={methodId}
              onChange={(next) => {
                setMethodId(next);
                setMachine('idle');
              }}
              options={methods.map((current) => ({ value: current.id, label: format.text(current.name) }))}
            />
            <TextField label={t.amount} type="number" inputMode="decimal" min={0} step="any" prefix={currency} value={amount === '' ? String(left) : amount} onChange={setAmount} disabled={machine === 'waiting'} width="100%" />
            {method?.kind === 'cash' && (
              <>
                <TextField label={t.received} type="number" inputMode="decimal" min={0} step="any" prefix={currency} value={received} onChange={setReceived} width="100%" />
                {received !== '' && Number(received) >= value && (
                  <Text variant="h3">
                    {t.change}: {format.money(change, currency)}
                  </Text>
                )}
              </>
            )}
            {(method?.kind === 'instapay' || method?.kind === 'wallet') && <TextField label={t.reference} hint={t.referenceHint} value={reference} onChange={setReference} width="100%" />}
            {method?.kind === 'storeCredit' && <Notice tone={creditLeft > 0 ? 'info' : 'warning'}>{creditLeft > 0 ? fillText(t.credit, { amount: format.money(creditLeft, currency) }) : t.noCredit}</Notice>}
            {method?.kind === 'card' ? (
              <Stack gap={vars.spacing[2]}>
                {machine === 'waiting' && <Notice tone="info">{t.waitingMachine}</Notice>}
                {typeof machine === 'object' && !machine.approved && (
                  <Notice tone="danger" title={t.declinedTitle}>
                    {t.declines[machine.reason]}
                  </Notice>
                )}
                <div>
                  <Button disabled={!(value > 0) || machine === 'waiting'} onClick={() => void sendToMachine()}>
                    {typeof machine === 'object' && !machine.approved ? t.retry : fillText(t.sendToMachine, { amount: format.money(value, currency) })}
                  </Button>
                </div>
              </Stack>
            ) : (
              <div>
                <Button variant="secondary" disabled={!canAdd} onClick={() => add({ methodId, amount: value, reference: reference.trim() || undefined })}>
                  {t.add}
                </Button>
              </div>
            )}
          </Stack>
        )}

        {error && <Notice tone="danger">{error}</Notice>}
        {left > 0 && payments.length === 0 && (
          <Text variant="caption" color={vars.colors.textMuted}>
            {t.notPaidYet}
          </Text>
        )}
        {/* One method paying everything left (not a card, which goes through the machine) completes in one step. */}
        <Button
          fullWidth
          size="lg"
          disabled={busy || !(left === 0 || (canAdd && value === left && method?.kind !== 'card'))}
          onClick={() => onComplete(left === 0 ? payments : [...payments, { methodId, amount: value, reference: reference.trim() || undefined }])}
        >
          {completeLabel ?? t.complete}
        </Button>
      </Stack>
    </Modal>
  );
};
