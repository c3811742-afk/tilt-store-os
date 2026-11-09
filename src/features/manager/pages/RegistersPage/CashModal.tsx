import { useState, type ReactNode } from 'react';
import { Button, Modal, Notice, Stack, TextAreaField, TextField } from '@/shared/components';
import { useErrorMessage, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync } from '@/shared/utils';

interface CashModalProps {
  title: ReactNode;
  hint?: string;
  currency?: string; // shown before the amount; without it only a note is asked
  submitLabel: string;
  noteRequired?: boolean;
  onSubmit: (amount: number, note: string) => Promise<unknown>;
  onClose: () => void;
}

// Asks for an amount of cash counted (and a note), or only a note. Keeps what was typed if saving fails.
export const CashModal = ({ title, hint, currency, submitLabel, noteRequired = false, onSubmit, onClose }: CashModalProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; note?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    const value = Number(amount);
    const found = { amount: currency && (amount.trim() === '' || !(value >= 0)) ? text.validation.number : undefined, note: noteRequired && !note.trim() ? text.validation.required : undefined };
    setErrors(found);
    if (found.amount || found.note) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => onSubmit(currency ? value : 0, note.trim()));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      info={hint}
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
            {submitLabel}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        {currency && <TextField label={text.manager.registers.counted} type="number" inputMode="decimal" min={0} step="0.01" prefix={currency} value={amount} onChange={setAmount} error={errors.amount} autoFocus width={vars.sizes.field.narrow} />}
        <TextAreaField label={text.common.note} optional={!noteRequired} required={noteRequired} value={note} onChange={setNote} error={errors.note} />
      </Stack>
    </Modal>
  );
};
