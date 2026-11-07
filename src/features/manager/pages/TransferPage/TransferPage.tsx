import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { cancelTransfer, closeTransferDifference, decideTransfer, getTransfer } from '@/shared/api';
import { AsyncContent, Button, Card, DecisionModal, Notice, PageHeader, ReceiveTransferForm, Stack, TextAreaField, TransferSummary } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useBranchScope, useErrorMessage, useLiveVersion, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// One transfer, seen by a branch manager: approve or reject it (when it leaves this branch), cancel a request,
// confirm what arrived (when it comes here) and close a difference with a note.
export const TransferPage = () => {
  const { transferId = '' } = useParams();
  const { text } = useLocale();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { session } = useSession();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getTransfer(transferId, branchId), [transferId, branchId, version]);
  const action = useAction();
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [done, setDone] = useState('');
  const t = text.staff.transfers;

  return (
    <AsyncContent state={state}>
      {(view) => {
        const { transfer } = view;
        const mineToDecide = view.direction === 'out' && view.stage === 'requested';
        const canCancel = (view.stage === 'requested' || view.stage === 'approved') && (transfer.requestedById === session?.user.id || view.direction === 'in' || mineToDecide);
        const canReceive = view.direction === 'in' && (view.stage === 'pickedUp' || view.stage === 'delivered');
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.manager.transfers, label: text.nav.transfers }}
              title={transfer.number}
              subtitle={t.directions[view.direction]}
              actions={
                <>
                  {canCancel && (
                    <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('cancel', () => cancelTransfer(transfer.id))}>
                      {t.cancel}
                    </Button>
                  )}
                  {mineToDecide && (
                    <>
                      <Button variant="secondary" onClick={() => setDeciding('reject')}>
                        {text.staff.decision.reject}
                      </Button>
                      <Button onClick={() => setDeciding('approve')}>{text.staff.decision.approve}</Button>
                    </>
                  )}
                </>
              }
            />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {done && <Notice tone="success">{done}</Notice>}
            <TransferSummary view={view} />
            {canReceive && <ReceiveTransferForm view={view} onDone={() => setDone(t.stages.received)} />}
            {view.differenceOpen && view.stage !== 'pickedUp' && (
              <Card title={t.differenceTitle}>
                <Stack
                  as="form"
                  gap={vars.spacing[3]}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (!note.trim()) return setNoteError(text.validation.required);
                    setNoteError('');
                    if (await action.run('close', () => closeTransferDifference(transfer.id, note))) setNote('');
                  }}
                >
                  <TextAreaField label={t.differenceNote} required value={note} onChange={setNote} error={noteError} />
                  <Stack direction="row" justify="flex-end">
                    <Button type="submit" disabled={Boolean(action.busy)}>
                      {t.closeDifference}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            )}
            <DecisionModal
              open={deciding !== null}
              decision={deciding ?? 'approve'}
              summary={`${transfer.number}`}
              onClose={() => setDeciding(null)}
              onConfirm={async ({ reasonId, note: decisionNote }) => {
                await decideTransfer(transfer.id, deciding === 'approve', reasonId, decisionNote);
                if (deciding === 'reject') navigate(routes.manager.transfers);
              }}
            />
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
