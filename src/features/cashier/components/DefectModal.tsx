import { useState } from 'react';
import { reportDefect } from '@/shared/api';
import { Button, Modal, Notice, SegmentedControl, SelectField, Stack, Text, TextAreaField, TextField } from '@/shared/components';
import { useErrorMessage, useForm, useFormat, useLocale, useReference, useWorkBranch } from '@/shared/hooks';
import { vars } from '@/shared/theme';

export interface DefectTarget {
  variantId: string;
  label: string;
  max: number; // pieces on the shelf here
}

// Report a defective piece from the counter: what is wrong, and whether it arrived like that or was damaged here.
export const DefectModal = ({ target, onClose, onDone }: { target: DefectTarget | null; onClose: () => void; onDone: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { settings } = useReference();
  const { branch } = useWorkBranch();
  const t = text.cashier.defect;
  const [done, setDone] = useState(false);
  const form = useForm(
    { qty: '1', reasonId: '', origin: 'received' as 'received' | 'store', note: '' },
    { reasonId: (value) => (value ? null : text.validation.required), qty: (value) => (Number(value) >= 1 && Number(value) <= (target?.max ?? 1) ? null : text.validation.positive) },
  );
  if (!target || !branch) return null;

  const onSubmit = form.submit(async (values) => {
    await reportDefect({ branchId: branch.id, variantId: target.variantId, qty: Number(values.qty), reasonId: values.reasonId, origin: values.origin, note: values.note.trim() || undefined });
    setDone(true);
    onDone();
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t.title}
      onSubmit={onSubmit}
      actions={
        done ? (
          <Button onClick={onClose}>{text.common.close}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={form.submitting}>
              {t.report}
            </Button>
          </>
        )
      }
    >
      <Stack gap={vars.spacing[4]}>
        {done && <Notice tone="success">{t.reported}</Notice>}
        {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
        <Text variant="h4" autoDirection>
          {target.label}
        </Text>
        <TextField label={t.qty} type="number" inputMode="numeric" min={1} max={target.max} {...form.field('qty')} width={vars.sizes.field.narrow} />
        <SelectField
          label={t.reason}
          placeholder={text.common.required}
          value={form.values.reasonId}
          onChange={(value) => form.setValue('reasonId', value)}
          options={settings.lists.defectReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
          error={form.errors.reasonId}
          width="100%"
        />
        <Stack gap={vars.spacing[1]}>
          <Text as="span" variant="bodySm">
            {t.origin}
          </Text>
          <SegmentedControl<'received' | 'store'>
            label={t.origin}
            value={form.values.origin}
            onChange={(value) => form.setValue('origin', value)}
            options={[
              { value: 'received', label: t.origins.received },
              { value: 'store', label: t.origins.store },
            ]}
          />
        </Stack>
        <TextAreaField label={t.note} rows={2} {...form.field('note')} width="100%" />
      </Stack>
    </Modal>
  );
};
