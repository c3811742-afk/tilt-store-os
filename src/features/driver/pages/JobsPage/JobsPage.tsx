import { listDriverJobs, type StaffTransferView } from '@/shared/api';
import { AsyncContent, PageHeader, Stack, Tabs, TransferCards } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';

type JobsTab = 'pickup' | 'onTheWay' | 'done';

const inTab: Record<JobsTab, (view: StaffTransferView) => boolean> = {
  pickup: (view) => view.stage === 'approved',
  onTheWay: (view) => view.stage === 'pickedUp',
  done: (view) => view.stage === 'delivered' || view.stage === 'received',
};

// The driver's transfers: only the ones assigned to them, to pick up, on the way and done.
export const JobsPage = () => {
  const { text } = useLocale();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<JobsTab>('tab', 'pickup');
  const state = useAsync(listDriverJobs, [version], () => false);
  const t = text.driver.jobs;
  const views = state.status === 'success' ? state.data : [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<JobsTab> label={t.title} value={tab} onChange={setTab} tabs={(['pickup', 'onTheWay', 'done'] as const).map((value) => ({ value, label: t.tabs[value], count: value === 'done' ? undefined : views.filter(inTab[value]).length || undefined }))}>
        <AsyncContent state={state}>{(data) => <TransferCards views={data.filter(inTab[tab])} empty={t.none} pathFor={(transferId) => toPath(routes.driver.job, { transferId })} />}</AsyncContent>
      </Tabs>
    </Stack>
  );
};
