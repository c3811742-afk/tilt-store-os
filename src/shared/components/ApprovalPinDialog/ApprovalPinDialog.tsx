import { useState } from 'react';
import { approveWithPin, listBranchApprovers } from '@/shared/api';
import { useAsync, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { approvalPinDialogDefaults } from './ApprovalPinDialog.defaults';
import type { ApprovalPinDialogProps } from './ApprovalPinDialog.types';

// A branch manager approves a request on the spot, on the cashier's screen: they pick their name, choose a reason
// and type their personal approval PIN. The PIN locks after too many wrong tries. The cashier's till opens this
// dialog for a request it created; the branch manager's Approvals page can open it too.
export const ApprovalPinDialog = (props: ApprovalPinDialogProps) => {
  const { open, approvalId, branchId, summary, onClose, onApproved } = withDefaults(approvalPinDialogDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const approvers = useAsync(() => listBranchApprovers(branchId), [branchId]);
  const [managerId, setManagerId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<{ manager?: string; reason?: string; pin?: string }>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const t = text.staff.pin;

  const submit = async () => {
    const found = {
      manager: managerId ? undefined : t.chooseManager,
      reason: reasonId ? undefined : text.staff.decision.reasonRequired,
      pin: /^\d{4}$/.test(pin) ? undefined : text.validation.pin,
    };
    setErrors(found);
    if (found.manager || found.reason || found.pin) return;
    setBusy(true);
    setMessage('');
    const result = await safeAsync(() => approveWithPin(approvalId, managerId, pin, reasonId));
    setBusy(false);
    setPin('');
    if (!result.ok) return setMessage(errorMessage(result.error));
    if (result.data.status === 'wrongPin') return setMessage(fillText(t.wrongPin, { tries: format.number(result.data.triesLeft) }));
    if (result.data.status === 'locked') return setMessage(text.errors.pinLocked);
    onApproved?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
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
            {t.approve}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {summary && <Text variant="bodySm">{summary}</Text>}
        <Text variant="caption" color={vars.colors.textMuted}>
          {t.hint}
        </Text>
        {message && <Notice tone="danger">{message}</Notice>}
        <SelectField
          label={t.manager}
          placeholder={t.chooseManager}
          value={managerId}
          onChange={setManagerId}
          error={errors.manager}
          options={(approvers.status === 'success' ? approvers.data : []).map((approver) => ({ value: approver.id, label: approver.locked ? `${approver.name} (${t.lockedName})` : approver.name, disabled: approver.locked }))}
        />
        <SelectField
          label={text.staff.decision.reason}
          placeholder={text.staff.decision.chooseReason}
          value={reasonId}
          onChange={setReasonId}
          error={errors.reason}
          options={settings.lists.approvalReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
        />
        <TextField label={t.pin} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={setPin} error={errors.pin} width={vars.sizes.field.narrow} />
      </Stack>
    </Modal>
  );
};
