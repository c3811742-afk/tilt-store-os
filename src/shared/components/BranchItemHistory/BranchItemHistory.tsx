import { getBranchItemHistory } from '@/shared/api';
import { stockStatusTone } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { StockPlace } from '@/shared/types';
import { vars } from '@/shared/theme';
import { AsyncContent } from '../AsyncContent';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Grid } from '../Grid';
import { Notice } from '../Notice';
import { OfflineStockNotice } from '../OfflineStockNotice';
import { PageHeader } from '../PageHeader';
import { Stack } from '../Stack';
import { StatCard } from '../StatCard';
import { Table } from '../Table';
import type { BranchItemHistoryProps } from './BranchItemHistory.types';

// One item in the signed-in person's branch: where its pieces are now (location and status), how many other
// branches have available, and every movement in and out of the branch.
export const BranchItemHistory = ({ variantId, back, actions, notice }: BranchItemHistoryProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getBranchItemHistory(branchId, variantId), [branchId, variantId, version]);
  const t = text.staff.stock;
  const o = text.owner.stock;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const place = (value?: StockPlace) =>
          value ? [value.branchId === branchId ? format.text(data.locationName[value.locationId]) : format.branch(value.branchId), o.statuses[value.status]].filter(Boolean).join(' · ') : '';
        const others = Object.entries(data.otherBranches).filter(([, qty]) => qty > 0);
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader back={back} title={`${data.productName} · ${data.size} · ${data.color}`} subtitle={`${format.brand(data.brandId)} · ${data.sku}`} actions={actions?.(data)} />
            <OfflineStockNotice />
            {notice}
            <Card title={t.whereNow}>
              {data.here.length ? (
                <Grid>
                  {data.here.map((level) => (
                    <StatCard key={`${level.locationId}${level.status}`} label={format.text(data.locationName[level.locationId])} value={format.number(level.qty)} detail={o.statuses[level.status]} />
                  ))}
                  <StatCard label={t.minimum} value={format.number(data.min)} />
                </Grid>
              ) : (
                <Notice>{t.out}</Notice>
              )}
            </Card>
            <Card title={t.inOtherBranches}>
              {others.length ? (
                <Grid>
                  {others.map(([id, qty]) => (
                    <StatCard key={id} label={format.branch(id)} value={format.number(qty)} detail={t.available} />
                  ))}
                </Grid>
              ) : (
                <Notice>{t.nowhereElse}</Notice>
              )}
            </Card>
            <Card title={t.history}>
              <Table
                label={t.history}
                stackOnMobile
                emptyText={t.noHistory}
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'kind', label: o.movement },
                  { key: 'qty', label: o.pieces, align: 'end' },
                  { key: 'from', label: text.common.from },
                  { key: 'to', label: text.common.to },
                  { key: 'by', label: text.common.by },
                ]}
                rows={data.movements.map((movement) => ({
                  key: movement.id,
                  cells: {
                    when: format.dateTime(movement.at),
                    kind: <Badge variant={movement.to?.status ? stockStatusTone[movement.to.status] : 'neutral'}>{o.movements[movement.kind]}</Badge>,
                    qty: format.number(movement.qty),
                    from: place(movement.from),
                    to: place(movement.to),
                    by: format.user(movement.byId),
                  },
                }))}
              />
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
