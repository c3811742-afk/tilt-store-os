import { useEffect } from 'react';
import type { ShiftSummary } from '@/shared/api';
import { Card, DetailList, Grid, PrintArea, StatCard, Text, type DetailItem } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from '../../components/receipt.module.css';

// The shift summary: who, when, the sales, the cash and card figures and the differences. On screen it is a normal
// page (figures, then the cash and the payments as two breakdowns); on paper it prints as a receipt, for the store's
// receipt printer. The page puts its Print button in the page header.
export const ShiftSummaryCard = ({ summary, autoPrint }: { summary: ShiftSummary; autoPrint?: boolean }) => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.cashier.shift;
  const { shift } = summary;
  const money = (amount: number) => format.money(amount || 0, shift.currency); // never "-EGP 0"
  useEffect(() => {
    if (autoPrint) window.print();
  }, [autoPrint]);

  const expected = shift.expectedCash ?? summary.expectedCash;
  const cashDifference = (shift.countedCash ?? 0) - expected;
  const cardExpected = shift.cardExpected ?? summary.cardTotal;
  const cardDifference = (shift.cardCounted ?? 0) - cardExpected;
  const difference = (amount: number) => (amount ? <Text as="span" color={vars.colors.danger}>{money(amount)}</Text> : t.matches);

  const details: DetailItem[] = [
    { key: 'till', label: t.till, value: summary.deviceName ?? shift.register },
    { key: 'cashier', label: text.cashier.receipt.cashier, value: summary.cashierName },
    { key: 'from', label: text.common.from, value: format.dateTime(shift.openedAt) },
    { key: 'to', label: text.common.to, value: shift.closedAt ? format.dateTime(shift.closedAt) : '' },
    ...(shift.note ? [{ key: 'note', label: t.note, value: shift.note }] : []),
  ];
  const cash: DetailItem[] = [
    { key: 'opening', label: t.openingCash, value: money(shift.openingCash) },
    { key: 'sales', label: t.cashSales, value: money(summary.cashSales) },
    { key: 'refunds', label: t.cashRefunds, value: money(-summary.cashRefunds) },
    { key: 'in', label: t.cashIn, value: money(summary.cashIn) },
    { key: 'out', label: t.cashOut, value: money(-summary.cashOut) },
    { key: 'expected', label: t.expectedCash, value: money(expected) },
    { key: 'counted', label: t.counted, value: money(shift.countedCash ?? 0) },
    { key: 'difference', label: t.difference, value: difference(cashDifference) },
  ];
  const payments: DetailItem[] = [
    { key: 'system', label: t.systemCard, value: money(cardExpected) },
    { key: 'machine', label: t.machineTotal, value: money(shift.cardCounted ?? 0) },
    { key: 'difference', label: t.difference, value: difference(cardDifference) },
    ...summary.byMethod.map(({ methodId, amount }) => ({ key: methodId, label: format.payment(methodId), value: money(amount) })),
  ];

  // On paper: the same figures as a receipt.
  const sheet = (
    <div className={styles.receipt}>
      <strong className={styles.center}>
        {t.summary} · {summary.branchName}
      </strong>
      <div className={styles.rule} />
      {[...details, { key: 'salesCount', label: t.salesCount, value: format.number(summary.sales) }, { key: 'salesTotal', label: t.salesTotal, value: money(summary.salesTotal) }, ...cash, ...payments].map((item) => (
        <div key={`print-${String(item.key)}-${String(item.label)}`} className={styles.split}>
          <span>{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Grid>
        <StatCard label={t.salesCount} value={format.number(summary.sales)} />
        <StatCard label={t.salesTotal} value={money(summary.salesTotal)} />
        <StatCard label={t.cashDifference} value={cashDifference ? money(cashDifference) : t.matches} />
        <StatCard label={t.cardDifference} value={cardDifference ? money(cardDifference) : t.matches} />
      </Grid>
      <Grid>
        <Card title={t.cashTitle}>
          <DetailList layout="rows" items={cash} />
        </Card>
        <Card title={t.paymentsTitle}>
          <DetailList layout="rows" items={payments} />
        </Card>
      </Grid>
      <Card title={t.detailsTitle}>
        <DetailList items={details} />
      </Card>
      <PrintArea>{sheet}</PrintArea>
    </>
  );
};
