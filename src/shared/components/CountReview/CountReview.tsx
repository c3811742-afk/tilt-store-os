import { useState } from 'react';
import { countLineKey, decideBranchCount } from '@/shared/api';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { DecisionModal } from '../DecisionModal';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import { countReviewDefaults } from './CountReview.defaults';
import type { CountReviewProps } from './CountReview.types';

// A submitted (or decided) stock count: expected against counted, the difference and its reason. A branch manager
// approves it within their limit, giving a reason for any difference that has none, which corrects the stock.
export const CountReview = (props: CountReviewProps) => {
  const { view, canDecide } = withDefaults(countReviewDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const { count } = view;
  const t = text.staff.counts;
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [missing, setMissing] = useState(false);
  const pending = count.status === 'pending';
  const editable = canDecide && pending && !view.needsOwner;
  const options = settings.lists.countReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }));
  const differences = view.lines.filter((line) => line.difference !== 0);
  const reasonOf = (line: (typeof view.lines)[number]) => reasons[countLineKey(line.variantId, line.locationId)] ?? line.reasonId ?? '';

  const openApprove = () => {
    if (differences.some((line) => !reasonOf(line))) return setMissing(true);
    setMissing(false);
    setDeciding('approve');
  };

  return (
    <Stack gap={vars.spacing[4]}>
      {count.submittedAt && (
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.submittedBy, { user: format.user(count.submittedById), date: format.dateTime(count.submittedAt) })}
        </Text>
      )}
      {count.decidedAt && (
        <Notice tone={count.status === 'approved' ? 'success' : 'info'}>
          {[fillText(t.decided, { decision: t.states[count.status], user: format.user(count.decidedById), date: format.dateTime(count.decidedAt) }), count.decisionReason && format.option(count.decisionReason)].filter(Boolean).join(' · ')}
        </Notice>
      )}
      {pending && canDecide && (
        <Notice tone={view.needsOwner ? 'warning' : 'info'}>
          {view.needsOwner ? fillText(t.aboveLimit, { pieces: format.number(view.totalDifference ?? 0), limit: format.number(view.limit) }) : fillText(t.withinLimit, { limit: format.number(view.limit) })}
        </Notice>
      )}
      {missing && <Notice tone="danger">{text.errors.missingReason}</Notice>}
      <Card title={fillText(t.totalDifference, { pieces: format.number(view.totalDifference ?? 0) })}>
        <Table filterable={false}
          label={count.number}
          stackOnMobile
          columns={[
            { key: 'item', label: text.staff.items.item },
            { key: 'expected', label: t.expected, align: 'end' },
            { key: 'counted', label: t.counted, align: 'end' },
            { key: 'difference', label: t.difference, align: 'end' },
            { key: 'reason', label: t.reasonFor },
          ]}
          rows={view.lines.map((line) => ({
            key: countLineKey(line.variantId, line.locationId),
            cells: {
              item: (
                <Stack gap={vars.spacing[0]}>
                  <Text as="span" variant="bodySm" autoDirection>
                    {line.productName}
                  </Text>
                  <Text as="span" variant="caption" color={vars.colors.textMuted}>
                    {[line.size, line.color, line.sku].filter(Boolean).join(' · ')}
                  </Text>
                </Stack>
              ),
              expected: format.number(line.expected ?? 0),
              counted: format.number(line.counted),
              difference: line.difference ? <Badge variant="warning">{format.number(line.difference)}</Badge> : '',
              reason:
                line.difference && editable ? (
                  <SelectField
                    label={<span aria-hidden />}
                    placeholder={text.staff.decision.chooseReason}
                    value={reasonOf(line)}
                    onChange={(reasonId) => setReasons({ ...reasons, [countLineKey(line.variantId, line.locationId)]: reasonId })}
                    options={options}
                  />
                ) : (
                  format.option(line.reasonId)
                ),
            },
          }))}
        />
      </Card>
      {editable && (
        <Stack direction="row" justify="flex-end" gap={vars.spacing[2]}>
          <Button variant="secondary" onClick={() => setDeciding('reject')}>
            {text.staff.decision.reject}
          </Button>
          <Button onClick={openApprove}>{t.approve}</Button>
        </Stack>
      )}
      <DecisionModal
        open={deciding !== null}
        decision={deciding ?? 'approve'}
        summary={count.number}
        onClose={() => setDeciding(null)}
        onConfirm={({ reasonId }) => decideBranchCount(count.id, deciding === 'approve', reasonId, reasons)}
      />
    </Stack>
  );
};
