import type { Dashboard } from '@/shared/api';
import { BarList, Card } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useFormat, useLocale } from '@/shared/hooks';
import type { DateRange } from '@/shared/utils';

// Every loss in one place: what the store paid for discounts, defects, lost stock and cash shortages.
export const LossesCard = ({ data, range }: { data: Dashboard; range: DateRange }) => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.dashboard.losses;
  const money = (amount: number) => format.money(amount, data.currency);
  const period = { period: 'custom', from: range.from, to: range.to };
  const rows = [
    { key: 'discounts', label: t.storeDiscounts, value: data.totals.storeDiscount, to: withQuery(routes.owner.reports, { ...period, report: 'discounts' }) },
    { key: 'returns', label: t.returns, value: data.totals.returnsAmount, to: withQuery(routes.owner.reports, { ...period, report: 'returns' }) },
    { key: 'defects', label: t.absorbedDefects, value: data.costs.absorbedDefects, to: routes.owner.defects },
    { key: 'writeOffs', label: t.writeOffs, value: data.costs.writeOffs, to: withQuery(routes.owner.stock, { tab: 'status' }) },
    { key: 'counts', label: t.countShortages, value: data.costs.countShortages, to: withQuery(routes.owner.reports, { ...period, report: 'counts' }) },
    { key: 'transfers', label: t.transferMissing, value: data.costs.transferMissing, to: withQuery(routes.owner.transfers, { tab: 'differences' }) },
    { key: 'cash', label: t.cashShortages, value: data.costs.cashShortages, to: withQuery(routes.owner.reports, { ...period, report: 'shifts' }) },
    { key: 'cardFees', label: t.cardFees, value: data.totals.fees, to: withQuery(routes.owner.reports, { ...period, report: 'sales' }) },
  ];
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const shown = rows.filter((row) => Math.round(row.value) !== 0).sort((a, b) => b.value - a.value);
  return (
    <Card title={t.title} actions={<strong>{money(total)}</strong>}>
      <BarList label={t.title} items={shown.map((row) => ({ key: row.key, label: row.label, value: row.value, display: money(row.value), to: row.to }))} />
    </Card>
  );
};
