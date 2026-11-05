import type { Dashboard } from '@/shared/api';
import { Card, DetailList, Text } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from './DashboardPage.module.css';

// Gross profit down to net profit: what comes in from shelf rent, and what goes out in fees, defects and expenses.
export const NetProfitCard = ({ data }: { data: Dashboard }) => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.dashboard.netProfitSteps;
  const money = (amount: number) => format.money(amount, data.currency);
  const minus = (amount: number) => money(-amount);
  const rows = [
    { key: 'net', label: t.netSales, value: money(data.totals.net) },
    { key: 'cost', label: t.cost, value: minus(data.totals.cost) },
    { key: 'gross', label: t.grossProfit, value: money(data.totals.profit), strong: true },
    { key: 'fees', label: t.monthlyFees, value: money(data.costs.monthlyFees) },
    { key: 'card', label: t.cardFees, value: minus(data.totals.fees) },
    { key: 'defects', label: t.absorbedDefects, value: minus(data.costs.absorbedDefects) },
    { key: 'writeOffs', label: t.writeOffs, value: minus(data.costs.writeOffs + data.costs.countShortages + data.costs.transferMissing) },
    { key: 'cash', label: t.cashShortages, value: minus(data.costs.cashShortages) },
    { key: 'expenses', label: t.expenses, value: minus(data.costs.expenses) },
    { key: 'netProfit', label: t.netProfit, value: money(data.netProfit), strong: true },
  ];
  return (
    <Card title={text.owner.dashboard.netProfit}>
      <ul className={styles.steps}>
        {rows.filter((row) => row.strong || row.key === 'net' || row.key === 'cost' || row.value !== money(0)).map((row) => (
          <li key={row.key} className={row.strong ? styles.strongStep : styles.step}>
            <span>{row.label}</span>
            <span>{row.value}</span>
          </li>
        ))}
      </ul>
      <DetailList items={[{ key: 'store', label: t.storeDiscounts, value: money(data.totals.storeDiscount) }]} />
      <Text variant="caption" color={vars.colors.textMuted}>
        {t.storeDiscountsNote}
      </Text>
    </Card>
  );
};
