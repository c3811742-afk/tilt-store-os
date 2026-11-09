import { useState } from 'react';
import { inspectReturnedItem, listAwaitingInspection, type InspectionOutcome, type InspectionRow } from '@/shared/api';
import { AsyncContent, Button, Card, Modal, Notice, SegmentedControl, SelectField, Stack, Table, TextAreaField, TextField } from '@/shared/components';
import { useAsync, useBranchScope, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import type { DefectLiability } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';

const outcomes: readonly InspectionOutcome[] = ['available', 'defective', 'toReturn'];

// Pieces customers returned, waiting for the storekeeper to confirm their condition.
export const InspectionSection = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => listAwaitingInspection(branchId), [branchId, version]);
  const [checking, setChecking] = useState<InspectionRow | null>(null);
  const [done, setDone] = useState(false);
  const t = text.storekeeper.inspection;

  return (
    <Card title={t.waiting}>
      {done && <Notice tone="success">{t.done}</Notice>}
      <AsyncContent state={state} empty={<Notice tone="success">{t.noneWaiting}</Notice>}>
        {(rows) => (
          <Table
            label={t.waiting}
            stackOnMobile
            columns={[
              { key: 'item', label: text.staff.items.item },
              { key: 'qty', label: text.common.quantity, align: 'end' },
              { key: 'since', label: text.common.when },
              { key: 'action', label: <span aria-hidden /> },
            ]}
            rows={rows.map((row) => ({
              key: `${row.variantId}|${row.locationId}`,
              cells: {
                item: `${row.productName} · ${row.size} · ${row.color} · ${format.brand(row.brandId)}`,
                qty: format.number(row.qty),
                since: row.since ? fillText(t.returnedOn, { date: format.dateTime(row.since) }) : '',
                action: (
                  <Button size="sm" onClick={() => setChecking(row)}>
                    {t.check}
                  </Button>
                ),
              },
            }))}
          />
        )}
      </AsyncContent>
      {checking && (
        <InspectModal
          row={checking}
          onClose={() => setChecking(null)}
          onDone={() => {
            setChecking(null);
            setDone(true);
          }}
        />
      )}
    </Card>
  );
};

const InspectModal = ({ row, onClose, onDone }: { row: InspectionRow; onClose: () => void; onDone: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const { brands, settings } = useReference();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const [outcome, setOutcome] = useState<InspectionOutcome>('available');
  const [qty, setQty] = useState(String(row.qty));
  const [reasonId, setReasonId] = useState('');
  const [liability, setLiability] = useState<DefectLiability>(brands.find((brand) => brand.id === row.brandId)?.defectPolicy === 'storeAbsorbs' ? 'store' : 'brand');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ qty?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.storekeeper.inspection;
  const d = text.staff.defects;

  const submit = async () => {
    const count = Math.floor(Number(qty));
    const found = { qty: count >= 1 && count <= row.qty ? undefined : text.validation.positive, reason: outcome === 'defective' && !reasonId ? text.validation.required : undefined };
    setErrors(found);
    if (found.qty || found.reason) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => inspectReturnedItem({ branchId, variantId: row.variantId, locationId: row.locationId, qty: count, outcome, reasonId: reasonId || undefined, liability, note: note.trim() || undefined }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={fillText(t.checkTitle, { item: `${row.productName} · ${row.size} · ${row.color}` })}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {t.save}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SegmentedControl<InspectionOutcome> label={t.outcome} value={outcome} onChange={setOutcome} options={outcomes.map((value) => ({ value, label: t.outcomes[value] }))} />
        <TextField label={text.common.quantity} type="number" inputMode="numeric" min={1} max={row.qty} value={qty} onChange={setQty} error={errors.qty} width={vars.sizes.field.narrow} />
        {outcome === 'defective' && (
          <>
            <SelectField
              label={d.defectType}
              required
              placeholder={text.staff.decision.chooseReason}
              value={reasonId}
              onChange={setReasonId}
              error={errors.reason}
              options={settings.lists.defectReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
            />
            <SegmentedControl<DefectLiability> label={d.whoPays} value={liability} onChange={setLiability} options={(['brand', 'store'] as const).map((value) => ({ value, label: d.liability[value] }))} />
          </>
        )}
        <TextAreaField label={d.notes} optional value={note} onChange={setNote} />
      </Stack>
    </Modal>
  );
};
