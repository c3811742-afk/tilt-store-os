import { useNavigate } from 'react-router';
import { getBranchBrandTotals, getBranchLowStock } from '@/shared/api';
import { AsyncContent, Badge, BranchStockLevels, Notice, PageHeader, Stack, Table, Tabs } from '@/shared/components';
import { routes, stockStatuses, toPath } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';

type StockTab = 'levels' | 'brands' | 'low';

const itemPath = (variantId: string) => toPath(routes.storekeeper.item, { variantId });

// The storekeeper's stock: levels by item (open one to change its status, move it or set its minimum), pieces per
// brand, and what is low.
export const StockPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<StockTab>('tab', 'levels');
  const brands = useAsync(() => getBranchBrandTotals(branchId), [branchId, version]);
  const low = useAsync(() => getBranchLowStock(branchId), [branchId, version]);
  const t = text.storekeeper.stock;
  const statusText = text.owner.stock.statuses;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<StockTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'levels', label: t.tabs.levels },
          { value: 'brands', label: t.tabs.brands },
          { value: 'low', label: t.tabs.low, count: low.status === 'success' ? low.data.length : undefined },
        ]}
      >
        {tab === 'levels' && <BranchStockLevels itemPath={itemPath} />}
        {tab === 'brands' && (
          <AsyncContent state={brands} empty={<Notice>{t.noBrands}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.brands}
                stackOnMobile
                columns={[
                  { key: 'brand', label: text.owner.fields.brand },
                  { key: 'onHand', label: t.onHand, align: 'end' },
                  { key: 'available', label: text.staff.stock.available, align: 'end' },
                  { key: 'other', label: text.common.status },
                ]}
                rows={rows.map((row) => ({
                  key: row.brandId,
                  cells: {
                    brand: format.brand(row.brandId),
                    onHand: format.number(row.onHand),
                    available: format.number(row.available),
                    other: stockStatuses
                      .filter((status) => status !== 'available' && (row.byStatus[status] ?? 0) > 0)
                      .map((status) => `${statusText[status]} ${format.number(row.byStatus[status] ?? 0)}`)
                      .join(' · '),
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
        {tab === 'low' && (
          <AsyncContent state={low} empty={<Notice tone="success">{text.manager.stock.noLow}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.low}
                stackOnMobile
                columns={[
                  { key: 'item', label: text.staff.items.item },
                  { key: 'qty', label: text.staff.stock.available, align: 'end' },
                  { key: 'min', label: text.staff.stock.minimum, align: 'end' },
                ]}
                rows={rows.map((row) => ({
                  key: row.variantId,
                  onClick: () => navigate(itemPath(row.variantId)),
                  cells: {
                    item: `${row.productName} · ${row.size} · ${row.color}`,
                    qty: <Badge variant={row.qty > 0 ? 'warning' : 'danger'}>{row.qty > 0 ? format.number(row.qty) : text.staff.stock.out}</Badge>,
                    min: format.number(row.min),
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
      </Tabs>
    </Stack>
  );
};
