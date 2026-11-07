import { useState } from 'react';
import { Button, Modal, SegmentedControl, SelectField, Stack, Text, TextField } from '@/shared/components';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import type { ManualDiscount } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

interface DiscountModalProps {
  open: boolean;
  title: string;
  current?: ManualDiscount;
  limitPercent: number;
  onSave: (discount: ManualDiscount | undefined) => void;
  onClose: () => void;
}

// A discount as a percentage or an amount, always with a reason. Above the limit, the counter asks for approval.
export const DiscountModal = ({ open, title, current, limitPercent, onSave, onClose }: DiscountModalProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const t = text.cashier.discount;
  const [type, setType] = useState<ManualDiscount['type']>(current?.type ?? 'percent');
  const [value, setValue] = useState(current ? String(current.value) : '');
  const [reasonId, setReasonId] = useState(current?.reasonId ?? '');
  const [tried, setTried] = useState(false);
  const number = Number(value);
  const valueError = !(number > 0) ? text.validation.positive : type === 'percent' && number > 100 ? text.validation.percent : undefined;
  const reasonError = reasonId ? undefined : text.validation.required;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (valueError || reasonError) return;
        // A new or changed discount needs its own approval; an unchanged one keeps the one it has.
        const same = current && current.type === type && current.value === number;
        onSave({ type, value: number, reasonId, approvalId: same ? current.approvalId : undefined });
      }}
      actions={
        <>
          {current && (
            <Button variant="secondary" onClick={() => onSave(undefined)}>
              {t.remove}
            </Button>
          )}
          <Button type="submit">{t.save}</Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <SegmentedControl<ManualDiscount['type']>
          label={t.type}
          value={type}
          onChange={setType}
          options={[
            { value: 'percent', label: t.percent },
            { value: 'amount', label: t.amount },
          ]}
        />
        <TextField label={t.value} type="number" inputMode="decimal" min={0} step="any" value={value} onChange={setValue} prefix={type === 'percent' ? text.common.percentSuffix : undefined} error={tried ? valueError : undefined} autoFocus width="100%" />
        <SelectField
          label={t.reason}
          placeholder={text.common.required}
          value={reasonId}
          onChange={setReasonId}
          options={settings.lists.discountReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
          error={tried ? reasonError : undefined}
          width="100%"
        />
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.limit, { limit: format.percent(limitPercent, 0) })}
        </Text>
      </Stack>
    </Modal>
  );
};
