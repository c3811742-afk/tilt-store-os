import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getBranchStock } from '@/shared/api';
import { stockStatuses } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { StockStatus } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { AsyncContent } from '../AsyncContent';
import { Badge } from '../Badge';
import { FilterBar } from '../FilterBar';
import { Notice } from '../Notice';
import { BrandSelect } from '../ReferenceSelect';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { branchStockLevelsDefaults } from './BranchStockLevels.defaults';
import type { BranchStockLevelsProps } from './BranchStockLevels.types';

// The branch's stock by brand, product, size and colour: what is on the floor and in the back room, pieces in each
// status, the minimum, and how many other branches have available. Quantities only, never cost or value.
export const BranchStockLevels = (props: BranchStockLevelsProps) => {
  const p = withDefaults(branchStockLevelsDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [query, setQuery] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState<StockStatus | ''>(p.status);
  const state = useAsync(() => getBranchStock(branchId, { query, brandId: brandId || undefined, status: status || undefined }), [branchId, query, brandId, status, version]);
  const t = text.staff.stock;
  const statusText = text.owner.stock.statuses;

  return (
    <Stack gap={vars.spacing[4]}>
      <FilterBar>
        <TextField type="search" label={text.common.search} value={query} onChange={setQuery} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
        <SelectField<StockStatus | ''>
          label={text.common.status}
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: t.anyStatus }, ...stockStatuses.map((value) => ({ value, label: statusText[value] }))]}
        />
      </FilterBar>
      <AsyncContent state={state}>
        {(data) => {
          const shown = data.rows.slice(0, p.limit);
          if (!shown.length) return <Notice>{t.noItems}</Notice>;
          const others = (counts: Record<string, number>) => {
            const list = data.otherBranchIds.filter((id) => counts[id] > 0).map((id) => `${format.branch(id)} ${format.number(counts[id])}`);
            return list.length ? list.join(' · ') : t.nowhereElse;
          };
          const otherStatuses = (row: (typeof shown)[number]) =>
            stockStatuses
              .filter((value) => value !== 'available' && (row.byStatus[value] ?? 0) > 0)
              .map((value) => `${statusText[value]} ${format.number(row.byStatus[value] ?? 0)}`)
              .join(' · ');
          return (
            <Stack gap={vars.spacing[2]}>
              {data.rows.length > p.limit && <Notice>{fillText(t.showingFirst, { count: format.number(p.limit) })}</Notice>}
              <Table
                label={text.owner.stock.tabs.levels}
                stackOnMobile
                columns={[
                  { key: 'brand', label: text.owner.fields.brand },
                  { key: 'item', label: text.staff.items.item },
                  { key: 'size', label: text.owner.fields.size },
                  { key: 'color', label: text.owner.fields.color },
                  { key: 'floor', label: t.floor, align: 'end' },
                  { key: 'back', label: t.backRoom, align: 'end' },
                  { key: 'available', label: t.available, align: 'end' },
                  { key: 'statuses', label: text.common.status },
                  { key: 'others', label: t.otherBranches },
                ]}
                rows={shown.map((row) => ({
                  key: row.variantId,
                  onClick: p.itemPath ? () => navigate(p.itemPath!(row.variantId)) : undefined,
                  cells: {
                    item: (
                      <Stack gap={vars.spacing[0]}>
                        <Text as="span" variant="bodySm" autoDirection>
                          {row.productName}
                        </Text>
                        <Text as="span" variant="caption" color={vars.colors.textMuted}>
                          {row.sku}
                        </Text>
                      </Stack>
                    ),
                    brand: format.brand(row.brandId),
                    size: row.size,
                    color: row.color,
                    floor: format.number(row.floor),
                    back: format.number(row.backRoom),
                    available: row.low ? <Badge variant={row.available > 0 ? 'warning' : 'danger'}>{`${format.number(row.available)} · ${row.available > 0 ? t.low : t.out}`}</Badge> : format.number(row.available),
                    statuses: otherStatuses(row),
                    others: others(row.otherBranches),
                  },
                }))}
              />
            </Stack>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
