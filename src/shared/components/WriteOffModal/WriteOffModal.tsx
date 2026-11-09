import { useState } from 'react';
import { getWriteOffLimit, requestWriteOff, type VariantHit } from '@/shared/api';
import { useAsync, useBranchScope, useErrorMessage, useFormat, useLocale, useQtyError, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { VariantSearch } from '../VariantSearch';
import { writeOffModalDefaults } from './WriteOffModal.defaults';
import type { WriteOffModalProps } from './WriteOffModal.types';

// Asks to write off lost pieces (or pieces damaged beyond repair) with a reason. The owner approves it.
export const WriteOffModal = (props: WriteOffModalProps) => {
  const p = withDefaults(writeOffModalDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const { branchId } = useBranchScope();
  const errorMessage = useErrorMessage();
  const [item, setItem] = useState<VariantHit | null>(p.initialItem ?? null);
  const [qty, setQty] = useState('1');
  const [reasonId, setReasonId] = useState('');
  const [errors, setErrors] = useState<{ item?: string; qty?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.defects;
  const qtyError = useQtyError();
  const limit = useAsync(() => (item ? getWriteOffLimit(branchId, item.variantId, p.kind) : Promise.resolve(null)), [branchId, item?.variantId, p.kind]);
  const most = limit.status === 'success' ? limit.data : null;

  const submit = async () => {
    const count = Math.floor(Number(qty));
    const found = { item: item ? undefined : t.chooseItem, qty: most === null ? (count >= 1 ? undefined : text.validation.positive) : qtyError(count, most), reason: reasonId ? undefined : text.validation.required };
    setErrors(found);
    if (found.item || found.qty || found.reason || !item) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => requestWriteOff({ branchId, variantId: item.variantId, qty: count, reasonId, kind: p.kind }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    p.onDone?.();
  };

  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      title={t.writeOffTitle}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={p.onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {t.writeOff}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        {item ? (
          <Notice action={<Button size="sm" variant="secondary" onClick={() => setItem(null)}>{text.common.edit}</Button>}>
            {`${item.productName} · ${item.size} · ${item.color} · ${format.brand(item.brandId)}`}
          </Notice>
        ) : (
          <Stack gap={vars.spacing[1]}>
            <VariantSearch label={t.item} onPick={setItem} autoFocus />
            {errors.item && (
              <Text variant="caption" color={vars.colors.danger}>
                {errors.item}
              </Text>
            )}
          </Stack>
        )}
        <TextField
          label={text.common.quantity}
          type="number"
          inputMode="numeric"
          min={1}
          max={most ?? undefined}
          value={qty}
          onChange={setQty}
          error={errors.qty}
          aside={most === null ? undefined : fillText(text.common.ofMax, { count: format.number(most) })}
          width={vars.sizes.field.narrow}
        />
        <SelectField
          label={t.reason}
          required
          placeholder={text.staff.decision.chooseReason}
          value={reasonId}
          onChange={setReasonId}
          error={errors.reason}
          options={settings.lists.writeOffReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
        />
      </Stack>
    </Modal>
  );
};
