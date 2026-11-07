import { useState } from 'react';
import { useParams } from 'react-router';
import { getBrandReturn, settleBrandReturn } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, DetailList, Notice, PageHeader, PrintButton, SegmentedControl, Stack, Table, Text, TextAreaField, TextField } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAsync, useBranchScope, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';

type Kind = 'replacement' | 'credit';

// One return to a brand: its return note to print and sign, and what the brand gave back (replacement or credit).
export const BrandReturnPage = () => {
  const { returnId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branches } = useReference();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getBrandReturn(returnId, branchId), [returnId, branchId, version]);
  const [kind, setKind] = useState<Kind>('replacement');
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.storekeeper.brandReturns;
  const currency = branches.find((branch) => branch.id === branchId)?.currency ?? '';

  return (
    <AsyncContent state={state}>
      {({ record, lines }) => {
        const pieces = lines.reduce((sum, line) => sum + line.qty, 0);
        const settle = async () => {
          const value = Number(kind === 'credit' ? amount : qty || pieces);
          if (!(value > 0)) return setFieldError(text.validation.positive);
          setFieldError('');
          setBusy(true);
          setError(null);
          const result = await safeAsync(() => settleBrandReturn(record.id, { kind, amount: kind === 'credit' ? value : undefined, qty: kind === 'replacement' ? value : undefined, note }));
          setBusy(false);
          if (!result.ok) return setError(result.error);
          state.retry();
        };
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.storekeeper.brandReturns, label: t.title }}
              title={fillText(t.noteTitle, { number: record.number })}
              actions={
                <>
                  <Badge variant={record.status === 'settled' ? 'success' : 'warning'}>{t.states[record.status]}</Badge>
                  <PrintButton label={t.printNote} />
                </>
              }
            />
            <Card>
              <DetailList
                items={[
                  { key: 'brand', label: text.owner.fields.brand, value: format.brand(record.brandId) },
                  { key: 'branch', label: text.shell.branch, value: format.branch(record.branchId) },
                  { key: 'date', label: text.staff.print.date, value: format.dateTime(record.at) },
                  { key: 'by', label: text.common.by, value: format.user(record.byId) },
                  ...(record.note ? [{ key: 'note', label: text.common.note, value: record.note }] : []),
                ]}
              />
            </Card>
            <Card>
              <Table
                label={record.number}
                stackOnMobile
                columns={[
                  { key: 'item', label: text.staff.items.item },
                  { key: 'condition', label: t.condition },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                ]}
                rows={lines.map((line, index) => ({ key: `${line.variantId}${index}`, cells: { item: `${line.productName} · ${line.size} · ${line.color} · ${line.sku}`, condition: t.conditions[line.condition], qty: format.number(line.qty) } }))}
                footer={{ item: text.common.total, qty: format.number(pieces) }}
              />
            </Card>
            <Card title={text.staff.transfers.signatures}>
              <Stack direction="row" wrap gap={vars.spacing[7]}>
                {[text.storekeeper.receiving.signedStorekeeper, text.owner.fields.brand].map((label) => (
                  <Stack key={label} gap={vars.spacing[5]}>
                    <Text as="span" variant="label" color={vars.colors.textMuted}>
                      {label}
                    </Text>
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>
                      {text.staff.print.signHere}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            </Card>
            {record.settlement ? (
              <Notice tone="success">
                {[
                  fillText(t.settled, { kind: t.kinds[record.settlement.kind], user: format.user(record.settlement.byId), date: format.dateTime(record.settlement.at) }),
                  record.settlement.amount !== undefined && format.money(record.settlement.amount, record.settlement.currency),
                  record.settlement.qty !== undefined && `${format.number(record.settlement.qty)} ${text.common.pieces}`,
                  record.settlement.note,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Notice>
            ) : (
              <Card title={t.settleTitle}>
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {t.settleHint}
                </Text>
                {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
                <SegmentedControl<Kind> label={t.settleTitle} value={kind} onChange={setKind} options={(['replacement', 'credit'] as const).map((value) => ({ value, label: t.kinds[value] }))} />
                {kind === 'credit' ? (
                  <TextField label={t.creditAmount} type="number" inputMode="decimal" min={0} prefix={currency} value={amount} onChange={setAmount} error={fieldError} width={vars.sizes.field.narrow} />
                ) : (
                  <TextField label={t.replacementQty} type="number" inputMode="numeric" min={1} max={pieces} placeholder={String(pieces)} value={qty} onChange={setQty} error={fieldError} width={vars.sizes.field.narrow} />
                )}
                <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
                <Stack direction="row" justify="flex-end">
                  <Button disabled={busy} onClick={() => void settle()}>
                    {t.settle}
                  </Button>
                </Stack>
              </Card>
            )}
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
