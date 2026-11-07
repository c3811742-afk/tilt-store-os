import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createBrandReturn, listReturnCandidates, type ReturnCandidate } from '@/shared/api';
import { AsyncContent, BrandSelect, Button, Card, Notice, PageHeader, Stack, Table, Text, TextAreaField, TextField } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useBranchScope, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync } from '@/shared/utils';

const keyOf = (row: ReturnCandidate) => `${row.variantId}|${row.locationId}|${row.status}`;

// A return to a brand: choose the brand, then how many of each piece goes back (set aside, defective or unsold).
export const NewBrandReturnPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const { branches } = useReference();
  const locations = branches.find((branch) => branch.id === branchId)?.locations ?? [];
  const where = (locationId: string) => format.text(locations.find((location) => location.id === locationId)?.name);
  const [brandId, setBrandId] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const candidates = useAsync(() => (brandId ? listReturnCandidates(branchId, brandId) : Promise.resolve([])), [branchId, brandId]);
  const t = text.storekeeper.brandReturns;
  const statusText = text.owner.stock.statuses;

  const submit = async (rows: ReturnCandidate[]) => {
    const lines = rows
      .map((row) => ({ variantId: row.variantId, locationId: row.locationId, status: row.status, defectId: row.defectId, qty: Math.min(Math.max(Math.floor(Number(qty[keyOf(row)] ?? 0)), 0), row.qty) }))
      .filter((line) => line.qty > 0);
    setMissing(!lines.length);
    if (!lines.length) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => createBrandReturn({ branchId, brandId, lines, note }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    navigate(toPath(routes.storekeeper.brandReturn, { returnId: result.data.id }));
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader back={{ to: routes.storekeeper.brandReturns, label: t.title }} title={t.newTitle} />
      <Card>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.newHint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <BrandSelect
          allLabel={t.chooseBrand}
          value={brandId}
          onChange={(value) => {
            setBrandId(value);
            setQty({});
          }}
          width={vars.sizes.field.maxWidth}
        />
        {brandId && (
          <AsyncContent state={candidates} empty={<Notice>{t.nothing}</Notice>}>
            {(rows) => (
              <Stack gap={vars.spacing[4]}>
                <Table
                  label={t.newTitle}
                  stackOnMobile
                  columns={[
                    { key: 'item', label: text.staff.items.item },
                    { key: 'where', label: text.storekeeper.stock.where },
                    { key: 'status', label: t.condition },
                    { key: 'there', label: text.staff.stock.available, align: 'end' },
                    { key: 'qty', label: t.returnQty, align: 'end' },
                  ]}
                  rows={rows.map((row) => ({
                    key: keyOf(row),
                    cells: {
                      item: `${row.productName} · ${row.size} · ${row.color}`,
                      where: where(row.locationId),
                      status: statusText[row.status],
                      there: format.number(row.qty),
                      qty: <TextField label={<span aria-hidden />} type="number" inputMode="numeric" min={0} max={row.qty} value={qty[keyOf(row)] ?? ''} onChange={(value) => setQty({ ...qty, [keyOf(row)]: value })} width={vars.sizes.field.qty} />,
                    },
                  }))}
                />
                {missing && (
                  <Text variant="caption" color={vars.colors.danger}>
                    {t.addItems}
                  </Text>
                )}
                <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
                <Stack direction="row" justify="flex-end">
                  <Button disabled={busy} onClick={() => void submit(rows)}>
                    {t.send}
                  </Button>
                </Stack>
              </Stack>
            )}
          </AsyncContent>
        )}
      </Card>
    </Stack>
  );
};
