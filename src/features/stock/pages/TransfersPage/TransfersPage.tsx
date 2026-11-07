import { useNavigate } from 'react-router';
import { listBranchTransfers, type StaffTransferView } from '@/shared/api';
import { AsyncContent, Button, PageHeader, Stack, Tabs, TransferCards } from '@/shared/components';
import { routes, toPath, withQuery } from '@/shared/constants';
import { useAsync, useBranchScope, useLiveVersion, useLocale, useQueryState, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';

type TransfersTab = 'prepare' | 'incoming' | 'requests' | 'outgoing' | 'all';

const tabs: readonly TransfersTab[] = ['prepare', 'incoming', 'requests', 'outgoing', 'all'];

// Transfers for the storekeeper: approved ones to prepare and hand to a driver (including the warehouse's
// dispatches for approved stock requests), ones arriving to receive, their own requests, and ones on the way.
export const TransfersPage = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  const { session } = useSession();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<TransfersTab>('tab', 'prepare');
  const state = useAsync(() => listBranchTransfers(branchId), [branchId, version], () => false);
  const t = text.storekeeper.transfers;
  const filters: Record<TransfersTab, (view: StaffTransferView) => boolean> = {
    prepare: (view) => view.direction === 'out' && view.stage === 'approved',
    incoming: (view) => view.direction === 'in' && (view.stage === 'approved' || view.stage === 'pickedUp' || view.stage === 'delivered'),
    requests: (view) => view.transfer.requestedById === session?.user.id && (view.stage === 'requested' || view.stage === 'approved'),
    outgoing: (view) => view.direction === 'out' && (view.stage === 'pickedUp' || view.stage === 'delivered'),
    all: () => true,
  };
  const views = state.status === 'success' ? state.data : [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={text.nav.transfers}
        subtitle={text.owner.transfers.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(withQuery(routes.storekeeper.newTransfer, { mode: 'request' }))}>
              {text.staff.transfers.requestFrom}
            </Button>
            <Button onClick={() => navigate(withQuery(routes.storekeeper.newTransfer, { mode: 'send' }))}>{t.newTransfer}</Button>
          </>
        }
      />
      <Tabs<TransfersTab>
        label={text.nav.transfers}
        value={tab}
        onChange={setTab}
        tabs={tabs.map((value) => ({ value, label: t.tabs[value], count: value === 'all' ? undefined : views.filter(filters[value]).length || undefined }))}
      >
        <AsyncContent state={state}>{(data) => <TransferCards views={data.filter(filters[tab])} pathFor={(transferId) => toPath(routes.storekeeper.transfer, { transferId })} />}</AsyncContent>
      </Tabs>
    </Stack>
  );
};
