import { useState } from 'react';
import { addCashMove, closeShift, getMyShift, openShift, type ShiftSummary } from '@/shared/api';
import { AsyncContent, Button, Card, Grid, Notice, PageHeader, SegmentedControl, SelectField, Stack, StatCard, Table, Text, TextAreaField, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference, useSession, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, fillText, roundMoney } from '@/shared/utils';
import { CashCount } from '../../components/CashCount';
import { countTotal } from '../../utils/cash';
import { ShiftSummaryCard } from './ShiftSummaryCard';
import styles from '../../components/cash.module.css';


// The cashier's shift: open it by counting the drawer, record cash in and out, then close it with a new count
// and the card machine's total. Every amount is in the branch's currency.
export const ShiftPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { settings } = useReference();
  const { session } = useSession();
  const { branch } = useBranchScope();
  const branchId = branch?.id ?? '';
  const t = text.cashier.shift;
  const state = useAsync(() => getMyShift(branchId), [branchId, version]);
  const action = useAction();
  const [deviceId, setDeviceId] = useState('');
  const [opening, setOpening] = useState<Record<string, number>>({});
  const [move, setMove] = useState({ kind: 'out' as 'in' | 'out', amount: '', reasonId: '', note: '' });
  const [moveTried, setMoveTried] = useState(false);
  const [closing, setClosing] = useState<Record<string, number>>({});
  const [cardCounted, setCardCounted] = useState('');
  const [note, setNote] = useState('');
  const [closeTried, setCloseTried] = useState(false);
  const [closed, setClosed] = useState<ShiftSummary | null>(null);

  if (closed) {
    return (
      <Stack gap={vars.spacing[5]}>
        <PageHeader
          title={t.closed}
          subtitle={fillText(t.closedAt, { time: format.time(closed.shift.closedAt ?? '') })}
          actions={
            <>
              <Button variant="secondary" onClick={() => setClosed(null)}>
                {t.openNew}
              </Button>
              <Button onClick={() => window.print()}>{t.print}</Button>
            </>
          }
        />
        <ShiftSummaryCard summary={closed} />
      </Stack>
    );
  }

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state}>
        {({ summary, devices, currency }) => {
          const money = (amount: number) => format.money(amount, currency);
          if (!summary) {
            return (
              <Card title={t.openTitle}>
                {devices.length > 0 && <SelectField label={t.till} value={deviceId || devices[0].id} onChange={setDeviceId} options={devices.map((device) => ({ value: device.id, label: device.name }))} width={vars.sizes.field.maxWidth} />}
                <CashCount currency={currency} value={opening} onChange={setOpening} />
                <div>
                  <Button disabled={Boolean(action.busy)} onClick={() => action.run('open', () => openShift(branchId, deviceId || devices[0]?.id, { count: opening, total: countTotal(opening) }))}>
                    {text.cashier.openShift}
                  </Button>
                </div>
              </Card>
            );
          }

          const { shift } = summary;
          const counted = countTotal(closing);
          const cashDifference = roundMoney(counted - summary.expectedCash);
          const machine = cardCounted === '' ? null : Number(cardCounted);
          const cardDifference = machine === null ? 0 : roundMoney(machine - summary.cardTotal);
          const needsNote = cashDifference !== 0 || cardDifference !== 0;
          const amount = Number(move.amount);

          return (
            <Stack gap={vars.spacing[5]}>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {fillText(t.openedBy, { name: session?.user.name ?? '', time: format.dateTime(shift.openedAt) })} · {summary.deviceName ?? shift.register}
              </Text>
              <Grid minColumnWidth={vars.sizes.statCard.minWidth}>
                <StatCard label={t.salesCount} value={format.number(summary.sales)} />
                <StatCard label={t.salesTotal} value={money(summary.salesTotal)} />
                <StatCard label={t.expectedCash} value={money(summary.expectedCash)} highlight />
                <StatCard label={t.cardTotal} value={money(summary.cardTotal)} />
              </Grid>

              <Card title={t.cashMoves}>
                <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-end">
                  <SegmentedControl<'in' | 'out'>
                    label={t.cashMoves}
                    value={move.kind}
                    onChange={(kind) => setMove({ ...move, kind })}
                    options={[
                      { value: 'out', label: t.cashOut },
                      { value: 'in', label: t.cashIn },
                    ]}
                  />
                </Stack>
                <div className={styles.compare}>
                  <TextField label={text.common.amount} type="number" inputMode="decimal" min={0} step="any" prefix={currency} value={move.amount} onChange={(value) => setMove({ ...move, amount: value })} error={moveTried && !(amount > 0) ? text.validation.positive : undefined} />
                  <SelectField
                    label={t.reason}
                    placeholder={text.common.required}
                    value={move.reasonId}
                    onChange={(reasonId) => setMove({ ...move, reasonId })}
                    options={settings.lists.cashMoveReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
                    error={moveTried && !move.reasonId ? text.validation.required : undefined}
                  />
                  <TextField label={t.note} value={move.note} onChange={(value) => setMove({ ...move, note: value })} />
                </div>
                <div>
                  <Button
                    variant="secondary"
                    disabled={Boolean(action.busy)}
                    onClick={async () => {
                      setMoveTried(true);
                      if (!(amount > 0) || !move.reasonId) return;
                      if (await action.run('move', () => addCashMove(shift.id, { kind: move.kind, amount, reasonId: move.reasonId, note: move.note.trim() || undefined }))) {
                        setMove({ kind: move.kind, amount: '', reasonId: '', note: '' });
                        setMoveTried(false);
                      }
                    }}
                  >
                    {move.kind === 'in' ? t.addCashIn : t.addCashOut}
                  </Button>
                </div>
                <Table
                  label={t.cashMoves}
                  emptyText={t.noCashMoves}
                  stackOnMobile
                  columns={[
                    { key: 'time', label: text.cashier.mySales.time },
                    { key: 'kind', label: text.common.status },
                    { key: 'reason', label: t.reason },
                    { key: 'amount', label: text.common.amount, align: 'end' },
                  ]}
                  rows={(shift.cashMoves ?? []).map((current) => ({
                    key: current.id,
                    cells: {
                      time: format.time(current.at),
                      kind: current.kind === 'in' ? t.cashIn : t.cashOut,
                      reason: [format.option(current.reasonId), current.note].filter(Boolean).join(' · '),
                      amount: `${current.kind === 'in' ? '+' : '-'}${money(current.amount)}`,
                    },
                  }))}
                />
              </Card>

              <Card title={t.closeTitle}>
                <CashCount currency={currency} value={closing} onChange={setClosing} />
                <div className={styles.compare}>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>{t.expectedCash}</span>
                    <span className={styles.figureValue}>{money(summary.expectedCash)}</span>
                  </div>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>{t.counted}</span>
                    <span className={styles.figureValue}>{money(counted)}</span>
                  </div>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>{t.difference}</span>
                    <span className={cx(styles.figureValue, cashDifference ? styles.off : styles.even)}>{cashDifference ? money(cashDifference) : t.matches}</span>
                  </div>
                </div>
                <div className={styles.compare}>
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>{t.systemCard}</span>
                    <span className={styles.figureValue}>{money(summary.cardTotal)}</span>
                  </div>
                  <TextField label={t.machineTotal} type="number" inputMode="decimal" min={0} step="any" prefix={currency} value={cardCounted} onChange={setCardCounted} error={closeTried && machine === null ? text.validation.required : undefined} />
                  <div className={styles.figure}>
                    <span className={styles.figureLabel}>{t.difference}</span>
                    <span className={cx(styles.figureValue, cardDifference ? styles.off : styles.even)}>{machine === null ? '' : cardDifference ? money(cardDifference) : t.matches}</span>
                  </div>
                </div>
                <TextAreaField label={t.differenceNote} hint={t.differenceNoteHint} rows={2} value={note} onChange={setNote} required={needsNote} error={closeTried && needsNote && !note.trim() ? text.validation.required : undefined} />
                <div>
                  <Button
                    disabled={Boolean(action.busy)}
                    onClick={async () => {
                      setCloseTried(true);
                      if (machine === null || (needsNote && !note.trim())) return;
                      const result = await action.run('close', () => closeShift(shift.id, { count: closing, total: counted, cardCounted: machine ?? 0, note }));
                      if (result) {
                        setClosed(result);
                        setClosing({});
                        setCardCounted('');
                        setNote('');
                        setCloseTried(false);
                      }
                    }}
                  >
                    {t.close}
                  </Button>
                </div>
              </Card>
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
