import { useNavigate } from 'react-router';
import { listBatches } from '@/shared/api';
import { AsyncContent, Badge, Checkbox, FilterToolbar, Notice, PageHeader, Stack, Table, filterField, recordRows, useTableFilters } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect, BrandSelect } from '../../components';

// Every received batch with its original and adjusted cost per piece.
export const CostingPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [defects, setDefects] = useQueryState('defects', '');
  const [pending, setPending] = useQueryState('pending', '');
  const columnFilters = useTableFilters();
  const version = useLiveVersion();
  const state = useAsync(() => listBatches({ brandId: brandId || undefined, branchId: branchId || undefined, withDefects: defects === '1', pending: pending === '1' }), [brandId, branchId, defects, pending, version]);
  const t = text.owner.costing;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <Notice>{t.pastSalesNote}</Notice>
      <FilterToolbar
        fields={[
          filterField('brand', <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />, { label: text.owner.fields.brand, value: brandId && format.brand(brandId), clear: () => setBrandId('') }),
          filterField('branch', <BranchSelect kinds={['store', 'warehouse']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />, { label: text.owner.fields.branch, value: branchId && format.branch(branchId), clear: () => setBranchId('') }),
          filterField('defects', <Checkbox label={t.onlyDefects} checked={defects === '1'} onChange={(checked) => setDefects(checked ? '1' : '')} />, { label: t.onlyDefects, value: defects === '1' && text.common.yes, clear: () => setDefects('') }),
          filterField('pending', <Checkbox label={t.onlyPending} checked={pending === '1'} onChange={(checked) => setPending(checked ? '1' : '')} />, { label: t.onlyPending, value: pending === '1' && text.common.yes, clear: () => setPending('') }),
        ]}
        table={columnFilters}
      />
      <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
        {(rows) => (
          <Table
            filters={columnFilters}
            label={t.title}
            columns={[
              { key: 'batch', label: t.batch },
              { key: 'product', label: text.owner.fields.product },
              { key: 'branch', label: text.owner.fields.branch, filterable: false }, // the Branch filter
              { key: 'qty', label: t.pieces, align: 'end' },
              { key: 'defects', label: t.defects, align: 'end' },
              { key: 'original', label: t.originalCost, align: 'end' },
              { key: 'adjusted', label: t.adjustedCost, align: 'end' },
              { key: 'status', label: text.common.status },
            ]}
            rows={recordRows(
              rows,
              (row) => row.batch.id,
              [
                { key: 'batch', label: '', render: (row) => `${row.batch.number} · ${format.date(row.batch.receivedAt)}` },
                { key: 'product', label: '', render: (row) => `${row.productName} · ${format.brand(row.batch.brandId)}` },
                { key: 'branch', label: '', render: (row) => format.branch(row.batch.branchId) },
                { key: 'qty', label: '', render: (row) => format.number(row.batch.qty) },
                { key: 'defects', label: '', render: (row) => format.number(row.batch.defects) },
                { key: 'original', label: '', render: (row) => format.money(row.costs.original, row.batch.currency) },
                { key: 'adjusted', label: '', render: (row) => format.money(row.costs.effective, row.batch.currency) },
                {
                  key: 'status',
                  label: '',
                  render: (row) =>
                    row.batch.redistribution === 'pending' ? (
                      <Badge variant="warning">{t.waiting}</Badge>
                    ) : row.batch.defects ? (
                      <Badge>{t.handlings[row.batch.defectHandling]}</Badge>
                    ) : null,
                },
              ],
              (row) => navigate(toPath(routes.owner.batch, { batchId: row.batch.id })),
            )}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
