import { useState } from 'react';
import { useNavigate } from 'react-router';
import { decideBranchApproval, type ApprovalView } from '@/shared/api';
import { Badge, Button, Card, DecisionModal, Notice, Stack, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// Requests waiting for the manager: what the tills sent to the manager's phone, and requests about a transfer or a
// count (which open that record). At the till itself, the manager approves with their PIN on the cashier's screen.
// Requests the manager may not decide say why.
export const WaitingTab = ({ views }: { views: ApprovalView[] }) => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState<{ view: ApprovalView; decision: 'approve' | 'reject' } | null>(null);
  const t = text.manager.approvals;
  const kinds = text.owner.approvalsPage.kinds;

  if (!views.length) return <Notice tone="success">{t.nothingWaiting}</Notice>;

  const recordPath = ({ approval }: ApprovalView) =>
    approval.kind === 'transfer' ? toPath(routes.manager.transfer, { transferId: approval.ref?.id ?? '' }) : approval.kind === 'stockCount' ? toPath(routes.manager.count, { countId: approval.ref?.id ?? '' }) : undefined;

  return (
    <Stack gap={vars.spacing[3]}>
      {views.map((view) => {
        const { approval, blocked } = view;
        const path = recordPath(view);
        const amount = approval.amount !== undefined ? format.money(approval.amount, approval.currency) : undefined;
        return (
          <Card
            key={approval.id}
            title={approval.summary}
            actions={
              <>
                {approval.percent !== undefined && <Badge variant="warning">{format.percent(approval.percent)}</Badge>}
                <Badge>{kinds[approval.kind]}</Badge>
              </>
            }
          >
            <Text variant="caption" color={vars.colors.textMuted}>
              {[fillText(t.requestedBy, { user: format.user(approval.requestedById), date: format.dateTime(approval.at) }), amount, approval.channel && text.owner.approvalsPage.channels[approval.channel]].filter(Boolean).join(' · ')}
            </Text>
            {blocked ? (
              <Notice tone="info">{t.blocked[blocked]}</Notice>
            ) : (
              <Stack direction="row" wrap gap={vars.spacing[2]} justify="flex-end">
                {path ? (
                  <Button size="sm" variant="secondary" onClick={() => navigate(path)}>
                    {text.common.view}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setDeciding({ view, decision: 'reject' })}>
                      {text.staff.decision.reject}
                    </Button>
                    <Button size="sm" onClick={() => setDeciding({ view, decision: 'approve' })}>
                      {text.staff.decision.approve}
                    </Button>
                  </>
                )}
              </Stack>
            )}
          </Card>
        );
      })}
      <DecisionModal
        open={deciding !== null}
        decision={deciding?.decision}
        summary={deciding?.view.approval.summary}
        onClose={() => setDeciding(null)}
        onConfirm={({ reasonId, note }) => decideBranchApproval(deciding?.view.approval.id ?? '', deciding?.decision === 'approve', reasonId, note)}
      />
    </Stack>
  );
};
