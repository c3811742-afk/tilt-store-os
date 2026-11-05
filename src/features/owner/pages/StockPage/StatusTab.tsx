import { getStockByStatus } from '@/shared/api';
import { AsyncContent, Badge, Stack, Table } from '@/shared/components';
import { stockStatusTone } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BrandSelect } from '../../components';

// Pieces in each status, per branch: available, reserved, in transit, waiting for inspection, defective...
export const StatusTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branches } = useReference();
  const [brandId, setBrandId] = useQueryState('brand', '');
  const version = useLiveVersion();
  const state = useAsync(() => getStockByStatus({ brandId: brandId || undefined }), [brandId, version]);
  const shown = branches.filter((branch) => !branch.archived);
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[4]}>
      <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
      <AsyncContent state={state}>
        {(rows) => (
          <Table
            label={t.tabs.status}
            columns={[{ key: 'status', label: text.common.status }, ...shown.map((branch) => ({ key: branch.id, label: branch.name, align: 'end' as const })), { key: 'total', label: text.common.total, align: 'end' }]}
            rows={rows.map((row) => ({
              key: row.status,
              cells: {
                status: <Badge variant={stockStatusTone[row.status]}>{t.statuses[row.status]}</Badge>,
                ...Object.fromEntries(shown.map((branch) => [branch.id, format.number(row.byBranch[branch.id] ?? 0)])),
                total: format.number(row.total),
              },
            }))}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
