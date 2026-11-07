import { useState } from 'react';
import { getLabelItems, type ReceivingView } from '@/shared/api';
import { Button, Card, DetailList, Notice, PrintButton, Stack, Table, Text } from '@/shared/components';
import { useBranchScope, useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, printLabels, safeAsync } from '@/shared/utils';

// A confirmed delivery: what was expected, received, defective and missing, both signatures, the receiving note to
// print for both sides, and the barcode labels and price tags for the pieces that arrived.
export const ReceivingRecord = ({ view }: { view: ReceivingView }) => {
  const { text, locale, theme } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const [error, setError] = useState<unknown>(null);
  const [blocked, setBlocked] = useState(false);
  const t = text.storekeeper.receiving;
  const { receiving } = view;

  const labels = async () => {
    setError(null);
    setBlocked(false);
    const result = await safeAsync(() => getLabelItems(branchId, view.lines.map((line) => line.variantId)));
    if (!result.ok) return setError(result.error);
    const printed = await safeAsync(async () =>
      printLabels(
        result.data.map((item) => ({
          title: item.productName,
          detail: `${item.size} · ${item.color}`,
          price: item.price === null ? text.staff.print.noPrice : format.money(item.price, item.currency),
          barcode: item.barcode,
          copies: view.lines.find((line) => line.variantId === item.variantId)?.received ?? 1,
        })),
        { title: fillText(t.noteTitle, { number: receiving.number }), dir: theme.dir, lang: locale },
      ),
    );
    if (!printed.ok) setBlocked(true);
  };

  const signature = (label: string, signed?: { name: string; signedAt: string }) => (
    <Stack gap={vars.spacing[1]}>
      <Text as="span" variant="label" color={vars.colors.textMuted}>
        {label}
      </Text>
      <Text as="span" variant="bodySm">
        {signed ? fillText(text.staff.signature.signedBy, { name: signed.name, date: format.dateTime(signed.signedAt) }) : text.staff.signature.notSigned}
      </Text>
    </Stack>
  );

  return (
    <Stack gap={vars.spacing[4]}>
      <Stack direction="row" wrap gap={vars.spacing[2]} justify="flex-end">
        <Button variant="secondary" onClick={() => void labels()}>
          {text.staff.print.printLabels}
        </Button>
        <PrintButton label={t.note} />
      </Stack>
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      {blocked && <Notice tone="warning">{text.staff.print.blocked}</Notice>}
      <Card>
        <DetailList
          items={[
            { key: 'brand', label: t.brand, value: format.brand(receiving.brandId) },
            { key: 'branch', label: text.shell.branch, value: format.branch(receiving.branchId) },
            { key: 'date', label: text.staff.print.date, value: format.dateTime(receiving.confirmedAt ?? receiving.at) },
            { key: 'by', label: text.common.by, value: format.user(receiving.byId) },
            ...(receiving.batchNumber || view.batchNumbers.length ? [{ key: 'batch', label: t.batches, value: view.batchNumbers.join(text.common.listSeparator) || receiving.batchNumber }] : []),
            ...(receiving.consignment ? [{ key: 'consignment', label: t.consignment, value: t.consignmentHint }] : []),
            ...(receiving.note ? [{ key: 'note', label: text.common.note, value: receiving.note }] : []),
          ]}
        />
      </Card>
      <Card title={t.items}>
        <Table
          label={t.items}
          stackOnMobile
          columns={[
            { key: 'item', label: text.staff.items.item },
            { key: 'barcode', label: t.barcode },
            { key: 'expected', label: t.expected, align: 'end' },
            { key: 'delivered', label: t.delivered, align: 'end' },
            { key: 'received', label: t.received, align: 'end' },
            { key: 'defective', label: t.defective, align: 'end' },
            { key: 'missing', label: t.missing, align: 'end' },
          ]}
          rows={view.lines.map((line) => ({
            key: line.variantId,
            cells: {
              item: `${line.productName} · ${line.size} · ${line.color}`,
              barcode: line.barcode,
              expected: format.number(line.expected),
              delivered: format.number(receiving.courier?.lines.find((signed) => signed.variantId === line.variantId)?.qty ?? line.received),
              received: format.number(line.received),
              defective: line.defective ? format.number(line.defective) : '',
              missing: line.missing ? format.number(line.missing) : '',
            },
          }))}
          footer={{ item: text.common.total, expected: format.number(view.lines.reduce((sum, line) => sum + line.expected, 0)), received: format.number(view.lines.reduce((sum, line) => sum + line.received, 0)) }}
        />
      </Card>
      <Card title={text.staff.transfers.signatures}>
        <Stack direction="row" wrap gap={vars.spacing[6]}>
          {signature(t.signedCourier, receiving.courier)}
          {signature(t.signedStorekeeper, receiving.storekeeper)}
        </Stack>
      </Card>
    </Stack>
  );
};
