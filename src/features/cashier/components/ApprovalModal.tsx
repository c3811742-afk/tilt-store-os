import { useEffect, useState, type ReactNode } from 'react';
import { approveAtTill, getApproval, listApprovers, requestApproval, type ApprovalInput } from '@/shared/api';
import { AsyncContent, Button, Modal, Notice, PinPad, SelectField, Stack } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

interface ApprovalModalProps {
  request: ApprovalInput | null; // what needs approval; null closes the box
  why: ReactNode; // e.g. "The discount is 15%, above your 10% limit."
  pendingId?: string; // already sent to a phone: show its answer
  onApproved: (approvalId: string) => void; // approved here with a PIN
  onSent: (approvalId: string) => void; // sent to a phone, waiting
  onClose: () => void;
}

// The approval box at the till: a manager (or owner) picks their name and enters their approval PIN, or the
// cashier sends the request to their phone and waits for the answer.
export const ApprovalModal = ({ request, why, pendingId, onApproved, onSent, onClose }: ApprovalModalProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const t = text.cashier.approval;
  const [approverId, setApproverId] = useState('');
  const [pin, setPin] = useState('');
  const action = useAction();
  const approvers = useAsync(() => (request ? listApprovers(request.branchId, request.level) : Promise.resolve([])), [request?.branchId, request?.level]);
  const sent = useAsync(() => (pendingId ? getApproval(pendingId) : Promise.resolve(null)), [pendingId, version]);
  const answer = sent.status === 'success' ? sent.data : null;

  // Approved from the phone: carry on as if it was approved here.
  useEffect(() => {
    if (answer?.status === 'approved') onApproved(answer.id);
  }, [answer?.status, answer?.id, onApproved]);

  const approve = async (value: string) => {
    if (!request || !approverId) return;
    const approval = await action.run('pin', () => approveAtTill(request, approverId, value));
    setPin('');
    if (approval) onApproved(approval.id);
  };

  return (
    <Modal open={Boolean(request)} onClose={onClose} title={t.title}>
      <Stack gap={vars.spacing[4]}>
        <Notice tone="warning">{why}</Notice>
        {answer && answer.status === 'pending' && <Notice tone="info">{t.waiting}</Notice>}
        {answer && answer.status === 'rejected' && <Notice tone="danger">{fillText(t.rejected, { name: answer.decidedByName ?? '' })}</Notice>}
        {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
        <AsyncContent state={approvers} empty={<Notice>{t.noApprovers}</Notice>}>
          {(list) => (
            <Stack gap={vars.spacing[4]} align="center">
              <SelectField
                label={t.approver}
                placeholder={t.chooseApprover}
                value={approverId}
                onChange={(value) => {
                  setApproverId(value);
                  action.clearError();
                }}
                options={list.map((approver) => ({ value: approver.id, label: approver.locked ? `${approver.name} (${t.locked})` : approver.name, disabled: approver.locked }))}
                width="100%"
              />
              {approverId && (
                <Stack gap={vars.spacing[1]}>
                  <PinPad label={t.pin} value={pin} onChange={setPin} onComplete={(value) => void approve(value)} disabled={Boolean(action.busy)} />
                </Stack>
              )}
            </Stack>
          )}
        </AsyncContent>
        <Stack gap={vars.spacing[2]}>
          <div>
            <Button
              variant="secondary"
              disabled={Boolean(action.busy) || answer?.status === 'pending'}
              onClick={async () => {
                if (!request) return;
                const approval = await action.run('send', () => requestApproval(request));
                if (approval) onSent(approval.id);
              }}
            >
              {t.sendToPhone}
            </Button>
          </div>
        </Stack>
      </Stack>
    </Modal>
  );
};
