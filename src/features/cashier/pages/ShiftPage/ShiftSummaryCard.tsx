import { useEffect } from 'react';
import type { ShiftSummary } from '@/shared/api';
import { Button, Card, PrintArea, Stack } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from '../../components/receipt.module.css';

// The printable shift summary: who, when, the sales, the cash and card figures and the differences.
export const ShiftSummaryCard = ({ summary, autoPrint }: { summary: ShiftSummary; autoPrint?: boolean }) => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.cashier.shift;
  const { shift } = summary;
  const money = (amount: number) => format.money(amount, shift.currency);
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  const rows: [string, string][] = [
    [t.till, summary.deviceName ?? shift.register],
    [text.cashier.receipt.cashier, summary.cashierName],
    [text.common.from, format.dateTime(shift.openedAt)],
    [text.common.to, shift.closedAt ? format.dateTime(shift.closedAt) : ''],
    [t.salesCount, format.number(summary.sales)],
    [t.salesTotal, money(summary.salesTotal)],
    [t.openingCash, money(shift.openingCash)],
    [t.cashSales, money(summary.cashSales)],
    [t.cashRefunds, money(-summary.cashRefunds)],
    [t.cashIn, money(summary.cashIn)],
    [t.cashOut, money(-summary.cashOut)],
    [t.expectedCash, money(shift.expectedCash ?? summary.expectedCash)],
    [t.counted, money(shift.countedCash ?? 0)],
    [t.difference, money((shift.countedCash ?? 0) - (shift.expectedCash ?? summary.expectedCash))],
    [t.systemCard, money(shift.cardExpected ?? summary.cardTotal)],
    [t.machineTotal, money(shift.cardCounted ?? 0)],
    ...summary.byMethod.map(({ methodId, amount }): [string, string] => [format.payment(methodId), money(amount)]),
  ];

  const sheet = (
    <div className={styles.receipt}>
      <strong className={styles.center}>
        {t.summary} · {summary.branchName}
      </strong>
      <div className={styles.rule} />
      {rows.map(([label, value]) => (
        <div key={label} className={styles.split}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
      {shift.note && (
        <>
          <div className={styles.rule} />
          <span>
            {t.note}: {shift.note}
          </span>
        </>
      )}
    </div>
  );

  return (
    <Stack gap={vars.spacing[4]}>
      <div>
        <Button onClick={() => window.print()}>{t.print}</Button>
      </div>
      <Card>{sheet}</Card>
      <PrintArea>{sheet}</PrintArea>
    </Stack>
  );
};
