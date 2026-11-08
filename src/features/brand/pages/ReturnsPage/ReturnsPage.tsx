import { getBrandReturns } from '@/shared/api';
import { AsyncContent, Badge, PageHeader, PeriodFilter, Stack, Table, Tabs } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, usePeriod, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';

type ReturnsTab = 'returns' | 'defects';

// Returns and defects of the brand's products, with the reason and where each piece went.
export const ReturnsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const period = usePeriod('month');
  const [tab, setTab] = useQueryState<ReturnsTab>('tab', 'returns');
  const t = text.brandPortal.returns;
  const state = useAsync(() => getBrandReturns(period.range), [period.range.from, period.range.to, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <PeriodFilter period={period} />
      <AsyncContent state={state}>
        {({ returns, defects }) => (
          <Tabs<ReturnsTab>
            label={t.title}
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'returns', label: t.returns, count: returns.length },
              { value: 'defects', label: t.defects, count: defects.length },
            ]}
          >
            {tab === 'returns' ? (
              <Table
                label={t.returns}
                stackOnMobile
                emptyText={t.noReturns}
                columns={[
                  { key: 'at', label: text.common.date },
                  { key: 'item', label: t.item },
                  { key: 'branch', label: t.branch },
                  { key: 'qty', label: t.qty, align: 'end' },
                  { key: 'reason', label: t.reason },
                  { key: 'sentTo', label: t.sentTo },
                ]}
                rows={returns.map((row) => ({
                  key: row.id,
                  cells: {
                    at: format.date(row.at),
                    item: `${row.name} · ${row.size} · ${row.color}`,
                    branch: row.branchName,
                    qty: format.number(row.qty),
                    reason: format.option(row.reasonId),
                    sentTo: <span><Badge variant={row.condition === 'available' ? 'neutral' : 'warning'}>{text.cashier.returns.conditions[row.condition as 'available' | 'defective' | 'toReturn'] ?? row.condition}</Badge></span>,
                  },
                }))}
              />
            ) : (
              <Table
                label={t.defects}
                stackOnMobile
                emptyText={t.noDefects}
                columns={[
                  { key: 'at', label: text.common.date },
                  { key: 'item', label: t.item },
                  { key: 'branch', label: t.branch },
                  { key: 'qty', label: t.qty, align: 'end' },
                  { key: 'reason', label: t.reason },
                  { key: 'liability', label: t.liability },
                  { key: 'status', label: t.status },
                ]}
                rows={defects.map((row) => ({
                  key: row.id,
                  cells: {
                    at: format.date(row.at),
                    item: `${row.name} · ${row.size} · ${row.color}`,
                    branch: row.branchName,
                    qty: format.number(row.qty),
                    reason: format.option(row.reasonId),
                    liability: t.liabilities[row.liability as 'brand' | 'store'] ?? row.liability,
                    status: <span><Badge>{text.owner.defects.statuses[row.status as keyof typeof text.owner.defects.statuses] ?? row.status}</Badge></span>,
                  },
                }))}
              />
            )}
          </Tabs>
        )}
      </AsyncContent>
    </Stack>
  );
};
