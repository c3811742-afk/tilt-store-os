import { decideCount, listCounts } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, Stack, Table, Text } from '@/shared/components';
import { approvalStateTone } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// Stock counts and their differences. Counts whose difference is above the limit in Policies need an owner.
export const CountsTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(listCounts, [version]);
  const action = useAction();
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[4]}>
      <Text variant="bodySm" color={vars.colors.textMuted}>
        {fillText(t.countLimit, { limit: format.number(settings.stockCountApprovalAbove) })}
      </Text>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.noCounts}</Notice>}>
        {(rows) => (
          <Stack gap={vars.spacing[3]}>
            {rows.map(({ count, differences, totalDifference, needsOwner }) => (
              <Card
                key={count.id}
                title={`${count.number} · ${format.branch(count.branchId)} · ${format.dateTime(count.at)}`}
                actions={
                  count.status === 'pending' ? (
                    <>
                      {needsOwner && <Badge variant="warning">{t.needsOwner}</Badge>}
                      <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run(count.id, () => decideCount(count.id, true))}>
                        {t.approveAdjust}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(count.id, () => decideCount(count.id, false))}>
                        {text.common.reject}
                      </Button>
                    </>
                  ) : (
                    <Badge variant={approvalStateTone[count.status]}>{text.owner.approvals.states[count.status]}</Badge>
                  )
                }
              >
                <Text variant="caption" color={vars.colors.textMuted}>
                  {fillText(t.countSummary, { lines: format.number(count.lines.length), difference: format.number(totalDifference), user: format.user(count.byId), blind: count.blind ? t.blind : '' })}
                </Text>
                {differences.length > 0 && (
                  <Table
                    label={count.number}
                    columns={[
                      { key: 'item', label: text.owner.fields.product },
                      { key: 'expected', label: t.expected, align: 'end' },
                      { key: 'counted', label: t.counted, align: 'end' },
                      { key: 'difference', label: t.difference, align: 'end' },
                      { key: 'reason', label: text.common.reason },
                    ]}
                    rows={differences.map((line) => ({
                      key: line.variantId,
                      cells: {
                        item: `${line.productName} · ${line.size} · ${line.color}`,
                        expected: format.number(line.expected),
                        counted: format.number(line.counted),
                        difference: format.number(line.difference),
                        reason: format.option(line.reasonId),
                      },
                    }))}
                  />
                )}
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
