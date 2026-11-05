import { useParams } from 'react-router';
import { getItemHistory } from '@/shared/api';
import { AsyncContent, Badge, Card, Grid, PageHeader, Stack, StatCard, Table } from '@/shared/components';
import { routes, stockStatusTone, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { StockPlace } from '@/shared/types';
import { vars } from '@/shared/theme';

// The full movement history of one item, and where its pieces are now.
export const ItemHistoryPage = () => {
  const { variantId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getItemHistory(variantId), [variantId, version]);
  const t = text.owner.stock;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const place = (value?: StockPlace) => (value ? `${format.branch(value.branchId)} · ${format.text(data.locationName[value.locationId])} · ${t.statuses[value.status]}` : '');
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader back={{ to: data.productId ? toPath(routes.owner.product, { productId: data.productId }) : routes.owner.stock, label: data.productName || t.title }} title={`${data.productName} · ${data.size} · ${data.color}`} subtitle={`${format.brand(data.brandId)} · ${data.sku}`} />
            <Grid>
              {data.levels.map((level) => (
                <StatCard key={`${level.branchId}${level.locationId}${level.status}`} label={`${format.branch(level.branchId)} · ${format.text(data.locationName[level.locationId])}`} value={format.number(level.qty)} detail={t.statuses[level.status]} />
              ))}
            </Grid>
            <Card title={t.history}>
              <Table
                label={t.history}
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'kind', label: t.movement },
                  { key: 'qty', label: t.pieces, align: 'end' },
                  { key: 'from', label: text.common.from },
                  { key: 'to', label: text.common.to },
                  { key: 'by', label: text.common.by },
                ]}
                rows={data.movements.map((movement) => ({
                  key: movement.id,
                  cells: {
                    when: format.dateTime(movement.at),
                    kind: <Badge variant={movement.to?.status ? stockStatusTone[movement.to.status] : 'neutral'}>{t.movements[movement.kind]}</Badge>,
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
