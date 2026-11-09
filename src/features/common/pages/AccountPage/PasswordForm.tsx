import { changePassword, type SessionUser } from '@/shared/api';
import { Button, Notice, Stack, TextField } from '@/shared/components';
import { accountDefaults } from '@/shared/constants';
import { useErrorMessage, useForm, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

interface PasswordFormProps {
  currentLabel: string; // "Current password", or "Temporary password" on first sign-in
  onChanged: (session: SessionUser) => void;
  done?: boolean; // shows "Your password is changed."
}

const empty = { current: '', next: '', confirm: '' };

// Current password, new password twice. Used on the account page and on first sign-in.
export const PasswordForm = ({ currentLabel, onChanged, done }: PasswordFormProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const t = text.account;
  const min = accountDefaults.minPasswordLength;
  const form = useForm(empty, {
    current: (value) => (value ? null : text.validation.required),
    next: (value) => (value.length >= min ? null : fillText(t.tooShort, { min })),
    confirm: (value, values) => (value === values.next ? null : t.mismatch),
  });

  const onSubmit = form.submit(async ({ current, next }) => {
    const session = await changePassword(current, next);
    form.reset(empty);
    onChanged(session);
  });

  return (
    <Stack as="form" onSubmit={onSubmit} gap={vars.spacing[4]}>
      {done && <Notice tone="success">{t.passwordChanged}</Notice>}
      {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
      <TextField label={currentLabel} type="password" autoComplete="current-password" {...form.field('current')} />
      <TextField label={t.newPassword} type="password" autoComplete="new-password" note={fillText(t.passwordHint, { min })} {...form.field('next')} />
      <TextField label={t.confirmPassword} type="password" autoComplete="new-password" {...form.field('confirm')} />
      <div>
        <Button type="submit" disabled={form.submitting}>
          {t.changePassword}
        </Button>
      </div>
    </Stack>
  );
};
