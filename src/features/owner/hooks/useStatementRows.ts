import type { StatementTotals } from '@/shared/types';
import { useFormat, useLocale } from '@/shared/hooks';

// A statement's totals as label / amount rows, in order, for the page and for the exports.
export const useStatementRows = () => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.payouts.totals;
  return (totals: StatementTotals, currency: string) => {
    const money = (amount: number) => format.money(amount, currency);
    return [
      { key: 'sold', label: t.sold, value: `${format.number(totals.soldUnits)} · ${money(totals.sales)}`, amount: totals.sales },
      { key: 'returned', label: t.returned, value: `${format.number(totals.returnedUnits)} · ${money(-totals.returns)}`, amount: -totals.returns },
      { key: 'discounts', label: t.brandDiscounts, value: money(-totals.brandDiscounts), amount: -totals.brandDiscounts },
      { key: 'commission', label: t.commission, value: money(-totals.commission), amount: -totals.commission },
      { key: 'defects', label: `${t.defects} (${format.number(totals.defectiveUnits)})`, value: money(-totals.defectDeductions), amount: -totals.defectDeductions },
      { key: 'fees', label: t.monthlyFees, value: money(-totals.monthlyFees), amount: -totals.monthlyFees },
      { key: 'carried', label: t.carriedIn, value: money(-totals.carriedIn), amount: -totals.carriedIn },
      { key: 'due', label: totals.amountDue >= 0 ? t.amountDue : t.brandOwes, value: money(Math.abs(totals.amountDue)), amount: totals.amountDue, strong: true },
    ];
  };
};
