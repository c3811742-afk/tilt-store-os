import { useNavigate } from 'react-router';
import { Card, PageHeader, Stack } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { PasswordForm } from './PasswordForm';

// After signing in with the owner's temporary password: choose a new one before anything else.
export const ChangePasswordPage = () => {
  const { text } = useLocale();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const t = text.account;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.firstTitle} subtitle={t.firstHint} />
      <Card>
        <PasswordForm
          currentLabel={t.temporaryPassword}
          onChanged={(session) => {
            setSession(session);
            navigate(routes.home);
          }}
        />
      </Card>
    </Stack>
  );
};
