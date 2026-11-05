import type { ReactNode } from 'react';
import { Button, FileField, Grid, Notice, SelectField, Stack, TextField } from '@/shared/components';
import type { BrandProfile } from '@/shared/api';
import { useErrorMessage, useForm, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { validators } from '../../utils';

export interface BrandProfileFormProps {
  initial: BrandProfile;
  submitLabel: string;
  onSubmit: (profile: BrandProfile) => Promise<unknown>;
  onCancel?: () => void;
  extra?: ReactNode; // more fields, e.g. the terms when adding a brand
}

// A brand's name, logo, contact person, payment details and contract start.
export const BrandProfileForm = ({ initial, submitLabel, onSubmit, onCancel, extra }: BrandProfileFormProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const check = validators(text);
  const t = text.owner.brands.profile;
  const form = useForm({ ...initial }, { name: check.required, contractStart: check.required, email: check.email });
  const payment = form.values.payment;
  const setPayment = (patch: Partial<BrandProfile['payment']>) => form.setValue('payment', { ...payment, ...patch });

  return (
    <Stack as="form" onSubmit={form.submit(onSubmit)} gap={vars.spacing[5]}>
      {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
      <Grid>
        <TextField label={t.name} required {...form.field('name')} />
        <TextField label={t.instagram} placeholder="@" {...form.field('instagram')} />
        <TextField label={t.contactName} {...form.field('contactName')} />
        <TextField label={t.phone} type="tel" inputMode="tel" {...form.field('phone')} />
        <TextField label={t.email} type="email" {...form.field('email')} />
        <TextField label={t.contractStart} type="date" required {...form.field('contractStart')} />
      </Grid>
      <FileField
        label={t.logo}
        accept="image/*"
        value={form.values.logo ? { name: t.logo, size: 0, dataUrl: form.values.logo } : null}
        onChange={(file) => form.setValue('logo', file?.dataUrl)}
      />
      <Grid>
        <SelectField
          label={t.paymentMethod}
          value={payment.method}
          onChange={(method) => setPayment({ method })}
          options={[
            { value: 'bank', label: t.bank },
            { value: 'instapay', label: t.instapay },
          ]}
        />
        {payment.method === 'bank' ? (
          <>
            <TextField label={t.bankName} value={payment.bankName} onChange={(bankName) => setPayment({ bankName })} />
            <TextField label={t.accountName} value={payment.accountName} onChange={(accountName) => setPayment({ accountName })} />
            <TextField label={t.accountNumber} value={payment.accountNumber} onChange={(accountNumber) => setPayment({ accountNumber })} />
          </>
        ) : (
          <TextField label={t.instapayAddress} placeholder="name@instapay" value={payment.instapay} onChange={(instapay) => setPayment({ instapay })} />
        )}
      </Grid>
      {extra}
      <Stack direction="row" gap={vars.spacing[2]} justify="flex-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            {text.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={form.submitting}>
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
};
