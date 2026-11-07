import { useState } from 'react';
import { decideApproval, listTillApprovals } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, SelectField, Stack, Text } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference, useSession, useWorkBranch } from '@/shared/hooks';
import { AccessPage } from '@/features/common/pages/AccessPage';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// A branch manager's phone: approve or reject what the tills sent. The cashier gets a notification either way.
export const TillApprovalsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { settings } = useReference();
  const { branch } = useWorkBranch();
  const action = useAction();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const t = text.cashier.approvals;
  const { session } = useSession();
  const state = useAsync(() => listTillApprovals(branch?.id ?? ''), [branch?.id, version]);
  if (!session?.permissions.includes('approvals.decide')) return <AccessPage />;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(list) => (
          <Stack gap={vars.spacing[3]}>
            {list.map((approval) => (
              <Card key={approval.id} title={approval.summary} actions={<Badge variant={approval.status === 'pending' ? 'warning' : approval.status === 'approved' ? 'success' : 'danger'}>{t.statuses[approval.status]}</Badge>}>
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {fillText(t.requestedBy, { name: approval.requestedByName })} · {format.dateTime(approval.at)}
                  {approval.amount !== undefined && approval.currency ? ` · ${format.money(approval.amount, approval.currency)}` : ''}
                </Text>
                {approval.status === 'pending' && (
                  <Stack direction="row" wrap align="flex-end" gap={vars.spacing[2]}>
                    <SelectField
                      label={t.reason}
                      placeholder={text.common.optional}
                      value={reasons[approval.id] ?? ''}
                      onChange={(value) => setReasons((current) => ({ ...current, [approval.id]: value }))}
                      options={settings.lists.approvalReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))}
                      width={vars.sizes.field.maxWidth}
                    />
                    <Button disabled={Boolean(action.busy)} onClick={() => action.run(approval.id, () => decideApproval(approval.id, true, format.option(reasons[approval.id]) || undefined))}>
                      {text.common.approve}
                    </Button>
                    <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(`no-${approval.id}`, () => decideApproval(approval.id, false, format.option(reasons[approval.id]) || undefined))}>
                      {text.common.reject}
                    </Button>
                  </Stack>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
