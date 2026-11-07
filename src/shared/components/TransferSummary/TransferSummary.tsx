import { transferStages, type TransferStage } from '@/shared/api';
import { useFormat, useLocale } from '@/shared/hooks';
import type { Signature } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { Card } from '../Card';
import { DetailList } from '../DetailList';
import { Notice } from '../Notice';
import { StatusTimeline, type TimelineStep } from '../StatusTimeline';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import type { TransferSummaryProps } from './TransferSummary.types';

// Everything about one transfer, for anyone who handles it: its steps, the quantities at each handover, and every
// signature with who signed and when. Quantities only, no cost.
export const TransferSummary = ({ view }: TransferSummaryProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.staff.transfers;
  const { transfer } = view;
  const stopped = view.stage === 'rejected' || view.stage === 'cancelled';
  const reached = stopped ? (transfer.decidedAt ? 1 : 0) : transferStages.indexOf(view.stage);

  const stamp = (at?: string, by?: string) => (at ? [format.dateTime(at), by && format.user(by)].filter(Boolean).join(' · ') : undefined);
  const stepDetail: Partial<Record<TransferStage, string | undefined>> = {
    requested: stamp(transfer.createdAt, transfer.requestedById),
    approved: transfer.status !== 'rejected' ? stamp(transfer.decidedAt, transfer.decidedById) : undefined,
    pickedUp: stamp(transfer.pickup?.signedAt, transfer.driverId),
    delivered: stamp(transfer.delivery?.signedAt, transfer.driverId),
    received: stamp(transfer.receivedAt, transfer.receivedById),
  };
  const steps: TimelineStep[] = transferStages.map((stage, index) => ({
    key: stage,
    label: t.stages[stage],
    detail: stepDetail[stage],
    state: index < reached || (!stopped && index === reached && stage === 'received') ? 'done' : index === reached && !stopped ? 'current' : 'upcoming',
  }));
  if (stopped) steps.splice(reached + 1, 0, { key: view.stage, label: t.stages[view.stage], detail: stamp(transfer.cancelledAt ?? transfer.decidedAt, transfer.cancelledById ?? transfer.decidedById), state: 'stopped' });

  const signatures = (['pickup', 'delivery', 'receipt'] as const)
    .map((kind) => ({ kind, signature: transfer[kind] as Signature | undefined }))
    .filter((entry): entry is { kind: 'pickup' | 'delivery' | 'receipt'; signature: Signature } => Boolean(entry.signature));
  const whoElse = { pickup: transfer.handedOverById && fillText(t.handedOverBy, { user: format.user(transfer.handedOverById) }), delivery: transfer.deliveredToId && fillText(t.takenBy, { user: format.user(transfer.deliveredToId) }), receipt: undefined };

  return (
    <Stack gap={vars.spacing[4]}>
      <Card>
        <StatusTimeline label={transfer.number} steps={steps} />
      </Card>
      {view.differenceOpen && <Notice tone="warning" title={t.differenceTitle}>{t.differenceHint}</Notice>}
      {transfer.differenceClosedAt && (
        <Notice tone="success">{fillText(t.differenceClosed, { user: format.user(transfer.differenceClosedById), date: format.dateTime(transfer.differenceClosedAt), note: transfer.differenceNote ?? '' })}</Notice>
      )}
      <Card>
        <DetailList
          items={[
            { key: 'from', label: text.common.from, value: format.branch(transfer.fromBranchId) },
            { key: 'to', label: text.common.to, value: format.branch(transfer.toBranchId) },
            { key: 'driver', label: t.driver, value: transfer.driverId ? format.user(transfer.driverId) : t.noDriver },
            ...(transfer.note ? [{ key: 'note', label: text.common.note, value: transfer.note }] : []),
            ...(transfer.decisionReason ? [{ key: 'reason', label: text.common.reason, value: [format.option(transfer.decisionReason), transfer.decisionNote].filter(Boolean).join(' · ') }] : []),
          ]}
        />
      </Card>
      <Card title={text.staff.items.item}>
        <Table
          label={transfer.number}
          stackOnMobile
          columns={[
            { key: 'item', label: text.staff.items.item },
            { key: 'requested', label: t.requested, align: 'end' },
            { key: 'pickedUp', label: t.pickedUp, align: 'end' },
            { key: 'delivered', label: t.delivered, align: 'end' },
            { key: 'received', label: t.received, align: 'end' },
            { key: 'defects', label: t.defects, align: 'end' },
            { key: 'missing', label: t.missing, align: 'end' },
            { key: 'extra', label: t.extra, align: 'end' },
          ]}
          rows={view.lines.map((line) => {
            const count = (value: number | null | undefined) => (value === null || value === undefined ? '' : format.number(value));
            return {
              key: line.variantId,
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
                requested: format.number(line.qty),
                pickedUp: count(line.pickupQty),
                delivered: count(line.deliveryQty),
                received: count(line.received),
                defects: count(line.received === undefined ? undefined : line.defects),
                missing: line.received === undefined ? '' : format.number(line.missing),
                extra: count(line.extra),
              },
            };
          })}
        />
      </Card>
      <Card title={t.signatures}>
        {signatures.length ? (
          <Stack gap={vars.spacing[3]}>
            {signatures.map(({ kind, signature }) => (
              <Stack key={kind} gap={vars.spacing[0]}>
                <Text as="span" variant="h4">
                  {t.signatureKinds[kind]}
                </Text>
                <Text as="span" variant="bodySm" color={vars.colors.textSecondary}>
                  {[fillText(text.staff.signature.signedBy, { name: signature.name, date: format.dateTime(signature.signedAt) }), whoElse[kind]].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {text.staff.signature.notSigned}
          </Text>
        )}
      </Card>
    </Stack>
  );
};
