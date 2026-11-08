import { useState } from 'react';
import { requestFromBranch, reserveInBranch } from '@/shared/api';
import { Button, Modal, Notice, SelectField, Stack, Text, TextField } from '@/shared/components';
import { tillDefaults } from '@/shared/constants';
import { useErrorMessage, useForm, useFormat, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

export interface ReserveTarget {
  mode: 'reserve' | 'request';
  variantId: string;
  label: string; // "Wide-leg denim 32 Black"
  branches: { branchId: string; name: string; qty: number }[]; // where it is available
  customer?: { name: string; phone: string };
}

// Reserve a piece in another branch for a customer (held until a time), or ask that branch to send it.
export const ReserveModal = ({ target, onClose, onDone }: { target: ReserveTarget | null; onClose: () => void; onDone: (message: string) => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branch } = useBranchScope();
  const t = text.cashier.reserve;
  const required = (value: string) => (value.trim() ? null : text.validation.required);
  const options = target?.branches.filter((current) => current.qty > 0) ?? [];
  const form = useForm(
    { fromBranchId: options[0]?.branchId ?? '', qty: '1', hours: String(tillDefaults.reservationHours[1]), name: target?.customer?.name ?? '', phone: target?.customer?.phone ?? '' },
    { fromBranchId: required, name: required, phone: required, qty: (value) => (Number(value) >= 1 ? null : text.validation.positive) },
  );
  const [done, setDone] = useState('');
  if (!target || !branch) return null;

  const onSubmit = form.submit(async (values) => {
    const input = { branchId: branch.id, variantId: target.variantId, qty: Number(values.qty), fromBranchId: values.fromBranchId, customer: { name: values.name, phone: values.phone } };
    const from = options.find((current) => current.branchId === values.fromBranchId)?.name ?? '';
    const message =
      target.mode === 'reserve'
        ? fillText(t.reserved, { branch: from, time: format.dateTime((await reserveInBranch({ ...input, hours: Number(values.hours) })).expiresAt) })
        : fillText(t.requested, { number: (await requestFromBranch(input)).number });
    setDone(message);
    onDone(message);
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={target.mode === 'reserve' ? t.title : t.requestTitle}
      onSubmit={onSubmit}
      actions={
        done ? (
          <Button onClick={onClose}>{text.common.close}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={form.submitting || !options.length}>
              {target.mode === 'reserve' ? t.reserve : t.request}
            </Button>
          </>
        )
      }
    >
      <Stack gap={vars.spacing[4]}>
        {done && <Notice tone="success">{done}</Notice>}
        {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
        <Text variant="h4" autoDirection>
          {target.label}
        </Text>
        {!options.length && <Notice>{text.cashier.sell.noneElsewhere}</Notice>}
        <SelectField
          label={t.from}
          value={form.values.fromBranchId}
          onChange={(value) => form.setValue('fromBranchId', value)}
          options={options.map((current) => ({ value: current.branchId, label: `${current.name} (${format.number(current.qty)})` }))}
          error={form.errors.fromBranchId}
          width="100%"
        />
        <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-start">
          <TextField label={t.qty} type="number" inputMode="numeric" min={1} {...form.field('qty')} width={vars.sizes.field.narrow} />
          {target.mode === 'reserve' && (
            <SelectField label={t.hours} value={form.values.hours} onChange={(value) => form.setValue('hours', value)} options={tillDefaults.reservationHours.map((hours) => ({ value: String(hours), label: fillText(t.hoursOption, { hours }) }))} width={vars.sizes.field.narrow} />
          )}
        </Stack>
        <Text variant="caption" color={vars.colors.textMuted}>
          {target.mode === 'reserve' ? t.reserveHint : t.requestHint}
        </Text>
        <TextField label={text.cashier.cart.customerName} {...form.field('name')} width="100%" />
        <TextField label={text.cashier.cart.customerPhone} type="tel" inputMode="tel" {...form.field('phone')} width="100%" />
      </Stack>
    </Modal>
  );
};
