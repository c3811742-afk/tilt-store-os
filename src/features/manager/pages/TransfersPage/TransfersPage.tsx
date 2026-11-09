import { useNavigate } from 'react-router';
import { listBranchTransfers, type StaffTransferView } from '@/shared/api';
import { AsyncContent, Button, PageHeader, Stack, Tabs, TransferCards } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useBranchScope, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';

type TransfersTab = 'approve' | 'incoming' | 'outgoing' | 'differences' | 'all';

const active = (view: StaffTransferView) => view.stage !== 'received' && view.stage !== 'rejected' && view.stage !== 'cancelled';

// Which transfers each tab shows, seen from the manager's branch.
const filters: Record<TransfersTab, (view: StaffTransferView) => boolean> = {
  approve: (view) => view.direction === 'out' && view.stage === 'requested',
  incoming: (view) => view.direction === 'in' && active(view),
  outgoing: (view) => view.direction === 'out' && active(view) && view.stage !== 'requested',
  differences: (view) => view.differenceOpen,
  all: () => true,
};

const tabs: readonly TransfersTab[] = ['approve', 'incoming', 'outgoing', 'differences', 'all'];

// Transfers into and out of the branch: what is waiting for the manager's approval, what is on its way, and any
// difference to review. Opens each transfer to approve, cancel, confirm arrival or close a difference.
export const TransfersPage = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<TransfersTab>('tab', 'approve');
  const state = useAsync(() => listBranchTransfers(branchId), [branchId, version], () => false);
  const t = text.staff.transfers;
  const views = state.status === 'success' ? state.data : [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={text.nav.transfers} actions={<Button onClick={() => navigate(routes.manager.newTransfer)}>{t.requestFrom}</Button>} />
      <Tabs<TransfersTab>
        label={text.nav.transfers}
        value={tab}
        onChange={setTab}
        tabs={tabs.map((value) => ({ value, label: t.tabs[value], count: value === 'all' ? undefined : views.filter(filters[value]).length || undefined }))}
      >
        <AsyncContent state={state}>{(data) => <TransferCards views={data.filter(filters[tab])} pathFor={(transferId) => toPath(routes.manager.transfer, { transferId })} />}</AsyncContent>
      </Tabs>
    </Stack>
  );
};
