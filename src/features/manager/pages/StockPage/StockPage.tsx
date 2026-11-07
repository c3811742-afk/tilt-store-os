import { useState } from 'react';
import { getBranchLowStock, getBranchStatusTotals, listBranchStockRequests, type VariantHit } from '@/shared/api';
import {
  AsyncContent,
  Badge,
  BranchStockLevels,
  Button,
  Card,
  Grid,
  Notice,
  PageHeader,
  Stack,
  StatCard,
  Table,
  Tabs,
  Text,
  type ItemLine,
} from '@/shared/components';
import { requestStatusTone, routes, stockStatuses, toPath, withQuery } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import type { StockStatus } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { RequestStockModal } from './RequestStockModal';

type StockTab = 'levels' | 'status' | 'low' | 'requests';

const itemPath = (variantId: string) => toPath(routes.manager.item, { variantId });

// A suggested quantity for a low item: back up to twice its minimum.
const suggestedQty = (qty: number, min: number) => Math.max(min * 2 - qty, 1);

// The branch's stock: levels by item (floor and back room), pieces by status, what is low, and new stock requests.
export const StockPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<StockTab>('tab', 'levels');
  const [status] = useQueryState<StockStatus | ''>('status', '');
  const [requesting, setRequesting] = useState<ItemLine[] | null>(null);
  const [sent, setSent] = useState('');
  const t = text.manager.stock;
  const statusText = text.owner.stock.statuses;

  const totals = useAsync(() => getBranchStatusTotals(branchId), [branchId, version], () => false);
  const low = useAsync(() => getBranchLowStock(branchId), [branchId, version]);
  const requests = useAsync(() => listBranchStockRequests(branchId), [branchId, version]);

  const openRequest = (lines: ItemLine[] = []) => {
    setSent('');
    setRequesting(lines);
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} actions={<Button onClick={() => openRequest()}>{t.requestStock}</Button>} />
      {sent && <Notice tone="success">{sent}</Notice>}
      <Tabs<StockTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'levels', label: t.tabs.levels },
          { value: 'status', label: t.tabs.status },
          { value: 'low', label: t.tabs.low, count: low.status === 'success' ? low.data.length : undefined },
          { value: 'requests', label: t.tabs.requests },
        ]}
      >
        {tab === 'levels' && <BranchStockLevels key={status} status={status} itemPath={itemPath} />}

        {tab === 'status' && (
          <AsyncContent state={totals}>
            {(data) => (
              <Stack gap={vars.spacing[3]}>
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {t.statusHint}
                </Text>
                <Grid>
                  {stockStatuses.map((value) => (
                    <StatCard key={value} label={statusText[value]} value={format.number(data[value] ?? 0)} to={withQuery(routes.manager.stock, { status: value })} />
                  ))}
                </Grid>
              </Stack>
            )}
          </AsyncContent>
        )}

        {tab === 'low' && (
          <AsyncContent state={low} empty={<Notice tone="success">{t.noLow}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.low}
                stackOnMobile
                columns={[
                  { key: 'item', label: text.staff.items.item },
                  { key: 'qty', label: text.staff.stock.available, align: 'end' },
                  { key: 'min', label: text.staff.stock.minimum, align: 'end' },
                  { key: 'action', label: <span aria-hidden /> },
                ]}
                rows={rows.map((row) => {
                  const hit: VariantHit = { variantId: row.variantId, barcode: '', productId: row.productId, productName: row.productName, brandId: row.brandId, size: row.size, color: row.color, sku: row.sku };
                  return {
                    key: row.variantId,
                    cells: {
                      item: `${row.productName} · ${row.size} · ${row.color}`,
                      qty: <Badge variant={row.qty > 0 ? 'warning' : 'danger'}>{row.qty > 0 ? format.number(row.qty) : text.staff.stock.out}</Badge>,
                      min: format.number(row.min),
                      action: (
                        <Button size="sm" variant="secondary" onClick={() => openRequest([{ ...hit, qty: suggestedQty(row.qty, row.min) }])}>
                          {t.request}
                        </Button>
                      ),
                    },
                  };
                })}
              />
            )}
          </AsyncContent>
        )}

        {tab === 'requests' && (
          <AsyncContent state={requests} empty={<Notice>{t.noRequests}</Notice>}>
            {(list) => (
              <Stack gap={vars.spacing[3]}>
                {list.map(({ request, lines }) => (
                  <Card key={request.id} title={request.number} actions={<Badge variant={requestStatusTone[request.status]}>{text.owner.stock.requestStates[request.status]}</Badge>}>
                    <Text variant="caption" color={vars.colors.textMuted}>
                      {fillText(t.requestedBy, { user: format.user(request.requestedById), date: format.dateTime(request.at) })}
                    </Text>
                    <Table
                      label={request.number}
                      columns={[
                        { key: 'item', label: text.staff.items.item },
                        { key: 'qty', label: text.staff.items.quantity, align: 'end' },
                      ]}
                      rows={lines.map((line) => ({ key: line.variantId, cells: { item: `${line.productName} · ${line.size} · ${line.color}`, qty: format.number(line.qty) } }))}
                    />
                    {request.note && <Text variant="bodySm">{request.note}</Text>}
                  </Card>
                ))}
              </Stack>
            )}
          </AsyncContent>
        )}
      </Tabs>
      {requesting && <RequestStockModal open initialLines={requesting} onClose={() => setRequesting(null)} onSent={setSent} />}
    </Stack>
  );
};
