import { useState } from 'react';
import { reportDefect, type VariantHit } from '@/shared/api';
import { useBranchScope, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import type { DefectFoundAt, DefectLiability, LocationKind, StoredFile } from '@/shared/types';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { FileField } from '../FileField';
import { Modal } from '../Modal';
import { Notice } from '../Notice';
import { SegmentedControl } from '../SegmentedControl';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextAreaField } from '../TextAreaField';
import { TextField } from '../TextField';
import { VariantSearch } from '../VariantSearch';
import { reportDefectModalDefaults } from './ReportDefectModal.defaults';
import type { ReportDefectModalProps } from './ReportDefectModal.types';

// Reports a defective or damaged item: which item, how many, where they are, the defect type and notes. Storekeepers
// also record who carries the cost and attach photos. The pieces leave sellable stock as soon as it is saved.
export const ReportDefectModal = (props: ReportDefectModalProps) => {
  const p = withDefaults(reportDefectModalDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { branches, brands, settings } = useReference();
  // The brand carries the cost when its terms say it replaces defects, the store otherwise.
  const liabilityFor = (brandId: string): DefectLiability => (brands.find((brand) => brand.id === brandId)?.defectPolicy === 'storeAbsorbs' ? 'store' : 'brand');
  const { branchId } = useBranchScope();
  const errorMessage = useErrorMessage();
  const branch = branches.find((current) => current.id === branchId);
  const kinds: LocationKind[] = branch?.kind === 'store' ? ['floor', 'backRoom'] : ['storage'];
  const [item, setItem] = useState<VariantHit | null>(p.initialItem ?? null);
  const [qty, setQty] = useState('1');
  const [locationKind, setLocationKind] = useState<LocationKind>(kinds[0]);
  const [reasonId, setReasonId] = useState('');
  const [foundAt, setFoundAt] = useState<DefectFoundAt>(p.foundAtOptions[0]);
  const [liability, setLiability] = useState<DefectLiability>(p.initialItem ? liabilityFor(p.initialItem.brandId) : 'brand');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<StoredFile[]>([]);
  const [errors, setErrors] = useState<{ item?: string; qty?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.defects;

  const submit = async () => {
    const count = Math.floor(Number(qty));
    const found = { item: item ? undefined : t.chooseItem, qty: count >= 1 ? undefined : text.validation.positive, reason: reasonId ? undefined : text.validation.required };
    setErrors(found);
    if (found.item || found.qty || found.reason || !item) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() =>
      reportDefect({ branchId, variantId: item.variantId, qty: count, locationKind, reasonId, foundAt, liability: p.showLiability ? liability : undefined, note: note.trim() || undefined, photos }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    p.onDone?.();
  };

  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      title={t.reportTitle}
      width={vars.sizes.modal.wide}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={p.onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {t.report}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.reportHint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        {item ? (
          <Notice action={<Button size="sm" variant="secondary" onClick={() => setItem(null)}>{text.common.edit}</Button>}>
            {`${item.productName} · ${item.size} · ${item.color} · ${format.brand(item.brandId)}`}
          </Notice>
        ) : (
          <Stack gap={vars.spacing[1]}>
            <VariantSearch label={t.item} onPick={(hit) => {
              setItem(hit);
              setLiability(liabilityFor(hit.brandId));
            }} autoFocus />
            {errors.item && <Text variant="caption" color={vars.colors.danger}>{errors.item}</Text>}
          </Stack>
        )}
        <Stack direction="row" wrap gap={vars.spacing[3]}>
          <TextField label={text.common.quantity} type="number" inputMode="numeric" min={1} value={qty} onChange={setQty} error={errors.qty} hint={t.qtyHint} width={vars.sizes.field.narrow} />
          {kinds.length > 1 && (
            <SelectField<LocationKind> label={t.where} value={locationKind} onChange={setLocationKind} options={kinds.map((kind) => ({ value: kind, label: kind === 'floor' ? text.staff.stock.floor : text.staff.stock.backRoom }))} width={vars.sizes.field.narrow} />
          )}
        </Stack>
        <SelectField
          label={t.defectType}
          required
          placeholder={text.staff.decision.chooseReason}
          value={reasonId}
          onChange={setReasonId}
          error={errors.reason}
          options={settings.lists.defectReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
        />
        {p.foundAtOptions.length > 1 && (
          <SelectField<DefectFoundAt> label={t.foundAt} value={foundAt} onChange={setFoundAt} options={p.foundAtOptions.map((value) => ({ value, label: text.owner.defects.foundAt[value] }))} />
        )}
        {p.showLiability && (
          <SegmentedControl<DefectLiability> label={t.whoPays} value={liability} onChange={setLiability} options={(['brand', 'store'] as const).map((value) => ({ value, label: t.liability[value] }))} />
        )}
        <TextAreaField label={t.notes} hint={text.common.optional} value={note} onChange={setNote} />
        {p.showPhotos && (
          <Stack gap={vars.spacing[2]}>
            {photos.map((photo) => (
              <Notice key={photo.dataUrl} action={<Button size="sm" variant="secondary" onClick={() => setPhotos(photos.filter((current) => current !== photo))}>{text.common.remove}</Button>}>
                {photo.name}
              </Notice>
            ))}
            {photos.length < p.maxPhotos && <FileField key={photos.length} label={t.addPhoto} accept="image/*" value={null} onChange={(file) => file && setPhotos([...photos, file])} />}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
};
