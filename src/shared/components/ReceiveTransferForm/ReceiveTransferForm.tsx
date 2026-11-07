import { useState } from 'react';
import { receiveTransfer } from '@/shared/api';
import { useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync } from '@/shared/utils';
import { Button } from '../Button';
import { Card } from '../Card';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { emptySignature, SignatureForm, signatureErrors, type SignatureField, type SignatureLine, type SignatureValue } from '../SignatureForm';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextAreaField } from '../TextAreaField';
import type { ReceiveTransferFormProps } from './ReceiveTransferForm.types';

// Confirming a transfer that arrived: for each product, how many came, how many are defective and any extra
// pieces, signed with the receiver's name. Missing pieces are what was picked up but not received.
export const ReceiveTransferForm = ({ view, onDone }: ReceiveTransferFormProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const t = text.staff.transfers;
  const sent = (variantId: string) => {
    const line = view.lines.find((current) => current.variantId === variantId);
    return line?.deliveryQty ?? line?.pickupQty ?? line?.qty ?? 0;
  };
  const lines: SignatureLine[] = view.lines.map((line) => ({
    variantId: line.variantId,
    label: `${line.productName} · ${line.size} · ${line.color}`,
    detail: [line.pickupQty !== null && `${t.pickedUp} ${format.number(line.pickupQty)}`, line.deliveryQty !== null && `${t.delivered} ${format.number(line.deliveryQty)}`].filter(Boolean).join(' · '),
  }));
  const fields: SignatureField[] = [
    { key: 'received', label: t.received },
    { key: 'defects', label: t.defects },
    { key: 'extra', label: t.extra },
  ];
  const [value, setValue] = useState<SignatureValue>(() => emptySignature(lines, fields, (variantId, field) => (field === 'received' ? sent(variantId) : 0)));
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ name?: string; confirmed?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const hasDefects = Object.values(value.quantities).some((quantities) => (quantities.defects ?? 0) > 0);

  const submit = async () => {
    const found = signatureErrors(value, { name: text.staff.signature.nameRequired, confirmed: text.staff.signature.confirmRequired });
    setErrors(found);
    if (found.name || found.confirmed) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() =>
      receiveTransfer(view.transfer.id, {
        signedName: value.name,
        lines: view.lines.map((line) => ({ variantId: line.variantId, received: value.quantities[line.variantId]?.received ?? 0, defects: value.quantities[line.variantId]?.defects ?? 0, extra: value.quantities[line.variantId]?.extra ?? 0 })),
        defectReasonId: reasonId || undefined,
        note: note.trim() || undefined,
      }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone?.();
  };

  return (
    <Card title={t.receiveTitle}>
      <Stack
        as="form"
        gap={vars.spacing[4]}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.receiveHint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SignatureForm lines={lines} fields={fields} value={value} onChange={setValue} statement={t.receiveStatement} errors={errors} disabled={busy} />
        {hasDefects && (
          <SelectField
            label={t.defectReason}
            placeholder={text.staff.decision.chooseReason}
            value={reasonId}
            onChange={setReasonId}
            options={settings.lists.defectReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
          />
        )}
        <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
        <Stack direction="row" justify="flex-end">
          <Button type="submit" disabled={busy}>
            {t.receive}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
};
