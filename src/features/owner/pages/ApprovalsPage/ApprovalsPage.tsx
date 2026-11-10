import { useState } from 'react';
import { decideApproval, listApprovals } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, SelectField, Stack, Table, Tabs, Text } from '@/shared/components';
import { approvalStateTone } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import type { ApprovalRequest } from '@/shared/types';
import { vars } from '@/shared/theme';

type ApprovalsTab = 'pending' | 'log';

// Everything waiting for an owner in one list (decided here from any phone), and the log of every approval.
export const ApprovalsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<ApprovalsTab>('tab', 'pending');
  const pending = useAsync(() => listApprovals({ status: 'pending' }), [version]);
  const log = useAsync(() => listApprovals({}), [version]);
  const action = useAction();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const t = text.owner.approvalsPage;
  const amount = (approval: ApprovalRequest) =>
    [approval.percent !== undefined ? format.percent(approval.percent) : '', approval.amount !== undefined && approval.currency ? format.money(approval.amount, approval.currency) : ''].filter(Boolean).join(' · ');

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<ApprovalsTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: t.tabs.pending, count: pending.status === 'success' ? pending.data.length : undefined },
          { value: 'log', label: t.tabs.log },
        ]}
      >
        {tab === 'pending' && (
          <AsyncContent state={pending} empty={<Notice tone="success">{t.nothingWaiting}</Notice>}>
            {(rows) => (
              <Stack gap={vars.spacing[3]}>
                {rows.map((approval) => (
                  <Card key={approval.id} title={`${t.kinds[approval.kind]} · ${approval.summary}`} actions={<Badge variant={approval.level === 'owner' ? 'warning' : 'info'}>{t.levels[approval.level]}</Badge>}>
                    <Text variant="bodySm" color={vars.colors.textMuted}>
                      {[format.user(approval.requestedById), approval.branchId ? format.branch(approval.branchId) : '', format.dateTime(approval.at), amount(approval), approval.channel ? t.channels[approval.channel] : ''].filter(Boolean).join(' · ')}
                    </Text>
                    <Stack direction="row" wrap align="flex-end" gap={vars.spacing[2]}>
                      <SelectField
                        label={text.common.reason}
                        placeholder={text.common.optional}
                        value={reasons[approval.id] ?? ''}
                        onChange={(value) => setReasons((current) => ({ ...current, [approval.id]: value }))}
                        options={settings.lists.approvalReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
                        width={vars.sizes.field.maxWidth}
                      />
                      <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run(approval.id, () => decideApproval(approval.id, true, format.option(reasons[approval.id]) || undefined))}>
                        {text.common.approve}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(approval.id, () => decideApproval(approval.id, false, format.option(reasons[approval.id]) || undefined))}>
                        {text.common.reject}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </AsyncContent>
        )}
        {tab === 'log' && (
          <AsyncContent state={log}>
            {(rows) => (
              <Table
                label={t.tabs.log}
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'what', label: t.what },
                  { key: 'asked', label: t.askedBy },
                  { key: 'amount', label: text.common.amount, align: 'end' },
                  { key: 'decided', label: t.decidedBy },
                  { key: 'status', label: text.common.status },
                ]}
                rows={rows.map((approval) => ({
                  key: approval.id,
                  values: { when: approval.at },
                  cells: {
                    when: format.dateTime(approval.at),
                    what: `${t.kinds[approval.kind]} · ${approval.summary}`,
                    asked: `${format.user(approval.requestedById)}${approval.branchId ? ` · ${format.branch(approval.branchId)}` : ''}`,
                    amount: amount(approval),
                    decided: approval.decidedById ? `${format.user(approval.decidedById)} · ${format.dateTime(approval.decidedAt ?? '')}${approval.reason ? ` · ${approval.reason}` : ''}` : '',
                    status: <Badge variant={approvalStateTone[approval.status]}>{text.owner.approvals.states[approval.status]}</Badge>,
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
      </Tabs>
    </Stack>
  );
};
