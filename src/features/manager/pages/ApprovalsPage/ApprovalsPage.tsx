import { listBranchApprovals } from '@/shared/api';
import { AsyncContent, Badge, Notice, PageHeader, Stack, Table, Tabs } from '@/shared/components';
import { approvalStateTone } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { PinTab } from './PinTab';
import { VoidSaleTab } from './VoidSaleTab';
import { WaitingTab } from './WaitingTab';

type ApprovalsTab = 'waiting' | 'void' | 'log' | 'pin';

// Everything waiting for the branch manager, voiding a sale, the log of every decision, and their approval PIN.
// Works the same on a phone, so the manager can decide when they are not at the till.
export const ApprovalsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<ApprovalsTab>('tab', 'waiting');
  const state = useAsync(() => listBranchApprovals(branchId), [branchId, version], () => false);
  const t = text.manager.approvals;
  const waiting = state.status === 'success' ? state.data.waiting.filter((view) => !view.blocked).length : undefined;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <Tabs<ApprovalsTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={(['waiting', 'void', 'log', 'pin'] as const).map((value) => ({ value, label: t.tabs[value], count: value === 'waiting' ? waiting || undefined : undefined }))}
      >
        {tab === 'waiting' && <AsyncContent state={state}>{(data) => <WaitingTab views={data.waiting} />}</AsyncContent>}
        {tab === 'void' && <VoidSaleTab />}
        {tab === 'log' && (
          <AsyncContent state={state}>
            {(data) =>
              data.log.length ? (
                <Table
                  label={t.tabs.log}
                  stackOnMobile
                  columns={[
                    { key: 'when', label: text.common.when },
                    { key: 'what', label: text.owner.approvalsPage.what },
                    { key: 'asked', label: text.owner.approvalsPage.askedBy },
                    { key: 'decided', label: text.owner.approvalsPage.decidedBy },
                    { key: 'why', label: text.common.reason },
                    { key: 'status', label: text.common.status },
                  ]}
                  rows={data.log.map(({ approval }) => ({
                    key: approval.id,
                    values: { when: approval.decidedAt ?? approval.at },
                    cells: {
                      when: format.dateTime(approval.decidedAt ?? approval.at),
                      what: `${text.owner.approvalsPage.kinds[approval.kind]} · ${approval.summary}${approval.amount !== undefined ? ` · ${format.money(approval.amount, approval.currency)}` : ''}`,
                      asked: format.user(approval.requestedById),
                      decided: [format.user(approval.decidedById), approval.channel && text.owner.approvalsPage.channels[approval.channel]].filter(Boolean).join(' · '),
                      why: [format.option(approval.reason), approval.note].filter(Boolean).join(' · '),
                      status: <Badge variant={approvalStateTone[approval.status]}>{text.owner.approvals.states[approval.status]}</Badge>,
                    },
                  }))}
                />
              ) : (
                <Notice>{t.noLog}</Notice>
              )
            }
          </AsyncContent>
        )}
        {tab === 'pin' && <PinTab />}
      </Tabs>
    </Stack>
  );
};
