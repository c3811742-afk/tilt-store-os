import { listSignedRecords, listTransfers, type TransferView } from '@/shared/api';
import { AsyncContent, Badge, Card, Notice, PageHeader, Stack, Table, Tabs, Text } from '@/shared/components';
import { transferStatusTone } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

type TransfersTab = 'all' | 'inTransit' | 'differences' | 'signed';

// Transfers between branches, the ones sent but not received, any with missing pieces, and every signed handover.
export const TransfersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<TransfersTab>('tab', 'all');
  const transfers = useAsync(listTransfers, [version]);
  const signed = useAsync(listSignedRecords, [version]);
  const t = text.owner.transfers;

  const transferCard = (view: TransferView) => (
    <Card
      key={view.transfer.id}
      title={`${view.transfer.number} · ${format.branch(view.transfer.fromBranchId)} → ${format.branch(view.transfer.toBranchId)}`}
      actions={
        <>
          {view.missing > 0 && <Badge variant="danger">{fillText(t.missing, { count: format.number(view.missing) })}</Badge>}
          {view.driverMismatch && <Badge variant="danger">{t.driverMismatch}</Badge>}
          <Badge variant={transferStatusTone[view.transfer.status]}>{t.states[view.transfer.status]}</Badge>
        </>
      }
    >
      <Text variant="caption" color={vars.colors.textMuted}>
        {[
          fillText(t.created, { date: format.dateTime(view.transfer.createdAt), user: format.user(view.transfer.requestedById) }),
          view.transfer.sentAt && fillText(t.sentOn, { date: format.dateTime(view.transfer.sentAt) }),
          view.transfer.receivedAt && fillText(t.receivedOn, { date: format.dateTime(view.transfer.receivedAt) }),
          view.transfer.driverId && fillText(t.driver, { name: format.user(view.transfer.driverId) }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Table
        label={view.transfer.number}
        columns={[
          { key: 'item', label: text.owner.fields.product },
          { key: 'sent', label: t.sent, align: 'end' },
          { key: 'pickup', label: t.pickedUp, align: 'end' },
          { key: 'delivered', label: t.delivered, align: 'end' },
          { key: 'received', label: t.received, align: 'end' },
        ]}
        rows={view.lines.map((line) => ({
          key: line.variantId,
          cells: {
            item: `${line.productName} · ${line.size} · ${line.color}`,
            sent: format.number(line.qty),
            pickup: line.pickupQty === null ? '' : format.number(line.pickupQty),
            delivered: line.deliveryQty === null ? '' : format.number(line.deliveryQty),
            received: line.received === undefined ? '' : format.number(line.received),
          },
        }))}
      />
    </Card>
  );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<TransfersTab> label={t.title} value={tab} onChange={setTab} tabs={(['all', 'inTransit', 'differences', 'signed'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        {tab !== 'signed' && (
          <AsyncContent state={transfers} empty={<Notice>{t.none}</Notice>}>
            {(rows) => {
              const shown = rows.filter((view) => (tab === 'inTransit' ? view.inTransit : tab === 'differences' ? view.missing > 0 || view.driverMismatch : true));
              return shown.length ? <Stack gap={vars.spacing[3]}>{shown.map(transferCard)}</Stack> : <Notice tone="success">{t.none}</Notice>;
            }}
          </AsyncContent>
        )}
        {tab === 'signed' && (
          <AsyncContent state={signed} empty={<Notice>{t.noSigned}</Notice>}>
            {(records) => (
              <Table
                label={t.tabs.signed}
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'document', label: t.document },
                  { key: 'kind', label: t.signatureKind },
                  { key: 'signed', label: t.signedBy },
                  { key: 'items', label: t.quantities },
                ]}
                rows={records.map((record) => ({
                  key: record.id,
                  cells: {
                    when: format.dateTime(record.signature.signedAt),
                    document: `${record.document}${record.fromBranchId ? ` · ${format.branch(record.fromBranchId)} → ` : ' · '}${format.branch(record.toBranchId)}`,
                    kind: t.signatureKinds[record.kind],
                    signed: record.signature.name,
                    items: record.lines.map((line) => `${line.productName} ${line.size} ${line.color}: ${format.number(line.qty)}${line.missing ? ` (−${format.number(line.missing)})` : ''}`).join(' · '),
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
