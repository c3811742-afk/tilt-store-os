import { useState } from 'react';
import { useNavigate } from 'react-router';
import { listBranchCounts, type CountView } from '@/shared/api';
import { useAsync, useBranchScope, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { AsyncContent } from '../AsyncContent';
import { Button } from '../Button';
import { CountCards } from '../CountCards';
import { PageHeader } from '../PageHeader';
import { Stack } from '../Stack';
import { StartCountModal } from '../StartCountModal';
import { Tabs } from '../Tabs';
import { branchCountsDefaults } from './BranchCounts.defaults';
import type { BranchCountsProps, CountsTab } from './BranchCounts.types';

const inTab: Record<CountsTab, (view: CountView) => boolean> = {
  open: (view) => view.count.status === 'open',
  pending: (view) => view.count.status === 'pending',
  done: (view) => view.count.status === 'approved' || view.count.status === 'rejected',
};

// The branch's stock counts: start a full or partial (optionally blind) count, follow the ones being counted, and
// open the ones waiting for approval. Used by branch managers and storekeepers.
export const BranchCounts = (props: BranchCountsProps) => {
  const { countPath, allowBlind, initialTab } = withDefaults(branchCountsDefaults, props);
  const { text } = useLocale();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<CountsTab>('tab', initialTab);
  const [starting, setStarting] = useState(false);
  const state = useAsync(() => listBranchCounts(branchId), [branchId, version], () => false);
  const t = text.staff.counts;
  const views = state.status === 'success' ? state.data : [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} actions={<Button onClick={() => setStarting(true)}>{t.start}</Button>} />
      <Tabs<CountsTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={(['pending', 'open', 'done'] as const).map((value) => ({ value, label: t.tabs[value], count: value === 'done' ? undefined : views.filter(inTab[value]).length || undefined }))}
      >
        <AsyncContent state={state}>{(data) => <CountCards views={data.filter(inTab[tab])} pathFor={countPath} />}</AsyncContent>
      </Tabs>
      {starting && <StartCountModal open allowBlind={allowBlind} onClose={() => setStarting(false)} onStarted={(count) => navigate(countPath?.(count.id) ?? '')} />}
    </Stack>
  );
};
