import { useState } from 'react';
import { approveShiftClosing, checkCash, closeRegister, noteCashDifference, type RegisterView } from '@/shared/api';
import { Badge, Button, Card, DecisionModal, DetailList, Notice, Stack, Text } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { CashModal } from './CashModal';

type Dialog = 'check' | 'close' | 'note' | 'approve' | null;

// One register: who is on it, its cash, any cash counts, and what the manager can do now.
export const RegisterCard = ({ view }: { view: RegisterView }) => {
  const { text } = useLocale();
  const format = useFormat();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState('');
  const { shift } = view;
  const t = text.manager.registers;
  const money = (amount: number) => format.money(amount, shift.currency);
  const needsNote = view.difference !== null && view.difference !== 0 && !shift.note;
  const user = format.user(shift.cashierId);

  return (
    <Card
      title={`${shift.register} · ${user}`}
      actions={
        <>
          {view.difference ? <Badge variant="danger">{`${t.difference} ${money(view.difference)}`}</Badge> : null}
          <Badge variant={view.open ? 'success' : shift.approvedById ? 'neutral' : 'warning'}>{view.open ? t.open : shift.approvedById ? t.approved : t.waiting}</Badge>
        </>
      }
    >
      <Text variant="caption" color={vars.colors.textMuted}>
        {view.open ? fillText(t.openedBy, { user, time: format.dateTime(shift.openedAt) }) : fillText(t.closedOn, { date: format.dateTime(shift.closedAt ?? '') })}
      </Text>
      <DetailList
        items={[
          { key: 'float', label: t.float, value: money(shift.openingCash) },
          { key: 'expected', label: t.expected, value: money(view.expected) },
          ...(shift.countedCash !== undefined ? [{ key: 'counted', label: t.counted, value: money(shift.countedCash) }] : []),
          ...(view.difference !== null ? [{ key: 'difference', label: t.difference, value: view.difference ? money(view.difference) : t.noDifference }] : []),
          ...(shift.note ? [{ key: 'note', label: text.common.note, value: shift.note }] : []),
        ]}
      />
      {view.checks.length > 0 && (
        <Stack gap={vars.spacing[1]}>
          <Text as="span" variant="label" color={vars.colors.textMuted}>
            {t.checks}
          </Text>
          {view.checks.map((check) => (
            <Text key={check.id} variant="caption">
              {`${format.dateTime(check.at)} · ${format.user(check.byId)} · ${fillText(t.checkDone, { counted: money(check.counted), expected: money(check.expected) })}${check.note ? ` · ${check.note}` : ''}`}
            </Text>
          ))}
        </Stack>
      )}
      {message && <Notice tone="success">{message}</Notice>}
      {needsNote && <Notice tone="warning">{t.needsNote}</Notice>}
      <Stack direction="row" wrap gap={vars.spacing[2]} justify="flex-end">
        {view.open && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setDialog('check')}>
              {t.checkCash}
            </Button>
            <Button size="sm" onClick={() => setDialog('close')}>
              {t.close}
            </Button>
          </>
        )}
        {!view.open && view.difference !== 0 && view.difference !== null && (
          <Button size="sm" variant="secondary" onClick={() => setDialog('note')}>
            {t.addNote}
          </Button>
        )}
        {!view.open && !shift.approvedById && (
          <Button size="sm" disabled={needsNote} onClick={() => setDialog('approve')}>
            {t.approve}
          </Button>
        )}
      </Stack>

      {dialog === 'check' && (
        <CashModal
          title={fillText(t.checkTitle, { register: shift.register })}
          hint={t.checkHint}
          currency={shift.currency}
          submitLabel={t.checkCash}
          onClose={() => setDialog(null)}
          onSubmit={async (amount, note) => {
            const check = await checkCash(shift.id, amount, note || undefined);
            setMessage(fillText(t.checkDone, { counted: money(check.counted), expected: money(check.expected) }));
          }}
        />
      )}
      {dialog === 'close' && (
        <CashModal title={fillText(t.closeTitle, { register: shift.register, user })} hint={t.closeHint} currency={shift.currency} submitLabel={t.close} onClose={() => setDialog(null)} onSubmit={(amount, note) => closeRegister(shift.id, amount, note || undefined)} />
      )}
      {dialog === 'note' && <CashModal title={t.noteTitle} submitLabel={text.common.save} noteRequired onClose={() => setDialog(null)} onSubmit={(_, note) => noteCashDifference(shift.id, note)} />}
      <DecisionModal open={dialog === 'approve'} decision="approve" title={t.approve} summary={`${shift.register} · ${user}`} onClose={() => setDialog(null)} onConfirm={({ reasonId }) => approveShiftClosing(shift.id, reasonId)} />
    </Card>
  );
};
