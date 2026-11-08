import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { Checkbox } from '../Checkbox';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { signatureFormDefaults } from './SignatureForm.defaults';
import type { SignatureFormProps, SignatureValue } from './SignatureForm.types';
import styles from './SignatureForm.module.css';

// An electronic signature on a handover: the quantity of each product, then the signer's typed full name and a
// tick to confirm. Used by drivers at pickup and delivery, and by storekeepers receiving stock.
export const SignatureForm = (props: SignatureFormProps) => {
  const { lines, fields, value, onChange, statement, errors, disabled, showSigner } = withDefaults(signatureFormDefaults, props);
  const { text } = useLocale();
  const t = text.staff.signature;
  const current: SignatureValue = value ?? { quantities: {}, name: '', confirmed: false };
  const set = (next: Partial<SignatureValue>) => onChange?.({ ...current, ...next });
  // Whole numbers from 0 up to each field's maximum. Every field is checked again after a change, so lowering
  // "received" also lowers "defects" if they no longer fit.
  const setQty = (variantId: string, field: string, raw: string) => {
    const row: Record<string, number> = { ...current.quantities[variantId], [field]: Math.max(0, Math.floor(Number(raw) || 0)) };
    fields.forEach((current) => {
      if (current.max) row[current.key] = Math.min(row[current.key] ?? 0, Math.max(0, current.max(variantId, row)));
    });
    set({ quantities: { ...current.quantities, [variantId]: row } });
  };

  return (
    <Stack gap={vars.spacing[4]}>
      {fields.length > 0 && (
        <Table
          label={text.staff.items.item}
          stackOnMobile
          columns={[{ key: 'item', label: text.staff.items.item }, ...fields.map((field) => ({ key: field.key, label: field.label, align: 'end' as const }))]}
          rows={lines.map((line) => ({
            key: line.variantId,
            cells: {
              item: (
                <Stack gap={vars.spacing[0]}>
                  <Text as="span" variant="bodySm" autoDirection>
                    {line.label}
                  </Text>
                  {line.detail && (
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>
                      {line.detail}
                    </Text>
                  )}
                </Stack>
              ),
              ...Object.fromEntries(
                fields.map((field) => [
                  field.key,
                  <TextField
                    key={field.key}
                    label={<span aria-hidden />}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={field.max?.(line.variantId, current.quantities[line.variantId] ?? {})}
                    width={vars.sizes.field.qty}
                    value={String(current.quantities[line.variantId]?.[field.key] ?? 0)}
                    onChange={(raw) => setQty(line.variantId, field.key, raw)}
                    disabled={disabled}
                  />,
                ]),
              ),
            },
          }))}
        />
      )}
      {showSigner && (
        <div className={styles.signature}>
          {statement && <Text variant="bodySm">{statement}</Text>}
          <TextField label={t.name} hint={t.nameHint} value={current.name} onChange={(name) => set({ name })} error={errors?.name} autoComplete="name" disabled={disabled} />
          <Checkbox label={t.confirm} checked={current.confirmed} onChange={(confirmed) => set({ confirmed })} disabled={disabled} />
          {errors?.confirmed && (
            <Text variant="caption" color={vars.colors.danger}>
              {errors.confirmed}
            </Text>
          )}
        </div>
      )}
    </Stack>
  );
};
