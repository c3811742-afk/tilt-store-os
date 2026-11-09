import { useState } from 'react';
import { useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextAreaField } from '../TextAreaField';
import { decisionModalDefaults } from './DecisionModal.defaults';
import type { DecisionModalProps } from './DecisionModal.types';

// Approve or reject something, with an optional note. Rejecting needs a reason from the owner's rejection reasons, so
// every "no" is saved with why; approving can take one of the approval reasons, but doesn't have to.
export const DecisionModal = (props: DecisionModalProps) => {
  const { open, decision, title, summary, reasons, confirmLabel, onConfirm, onClose } = withDefaults(decisionModalDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.decision;
  const required = decision === 'reject';
  const options = settings.lists[reasons ?? (required ? 'rejectionReasons' : 'approvalReasons')].filter((option) => !option.archived);

  const submit = async () => {
    if (required && !reasonId) return setMissing(true);
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => onConfirm?.({ reasonId, note: note.trim() || undefined }) ?? Promise.resolve());
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (decision === 'approve' ? t.approveTitle : t.rejectTitle)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" variant={decision === 'approve' ? 'primary' : 'danger'} disabled={busy}>
            {confirmLabel ?? (decision === 'approve' ? t.approve : t.reject)}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {summary && <Text variant="bodySm">{summary}</Text>}
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SelectField
          label={t.reason}
          required={required}
          hint={required ? undefined : text.common.optional}
          placeholder={t.chooseReason}
          value={reasonId}
          onChange={(value) => {
            setReasonId(value);
            setMissing(false);
          }}
          error={missing ? t.reasonRequired : undefined}
          options={options.map((option) => ({ value: option.id, label: format.option(option.id) }))}
        />
        <TextAreaField label={t.note} hint={text.common.optional} value={note} onChange={setNote} />
      </Stack>
    </Modal>
  );
};
