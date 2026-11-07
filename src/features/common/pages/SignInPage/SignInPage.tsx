import { Navigate, useNavigate } from 'react-router';
import { demoAccounts, signIn } from '@/shared/api';
import { AsyncContent, BrandLogo, Button, Card, Notice, Stack, Text, TextField } from '@/shared/components';
import { homeFor } from '@/shared/constants';
import { useAppearance, useAsync, useErrorMessage, useForm, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { localized } from '@/shared/utils';
import styles from './SignInPage.module.css';

export const SignInPage = () => {
  const { text, locale, switchLocale } = useLocale();
  const { appearance, switchAppearance } = useAppearance();
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const accounts = useAsync(demoAccounts, []);
  const required = (value: string) => (value.trim() ? null : text.validation.required);
  const form = useForm({ login: '', password: '' }, { login: required, password: required });

  const home = session ? homeFor(session.roles) : undefined;
  if (home) return <Navigate to={home} replace />;

  const onSubmit = form.submit(async ({ login, password }) => {
    const signed = await signIn(login, password);
    setSession(signed);
    const signedHome = homeFor(signed.roles);
    if (signedHome) navigate(signedHome);
  });

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.tools}>
          <Button variant="muted" size="sm" onClick={switchLocale}>
            {text.common.switchLanguage}
          </Button>
          <Button variant="muted" size="sm" onClick={switchAppearance}>
            {appearance === 'light' ? text.common.darkMode : text.common.lightMode}
          </Button>
        </div>
        <BrandLogo size="lg" />
        <Card>
          <Stack as="form" onSubmit={onSubmit} gap={vars.spacing[4]}>
            <Stack gap={vars.spacing[1]}>
              <Text as="h1" variant="h2">
                {text.signIn.title}
              </Text>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {text.signIn.subtitle}
              </Text>
            </Stack>
            {session && !home && <Notice tone="warning">{text.signIn.noAccess}</Notice>}
            {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
            <TextField label={text.signIn.login} autoComplete="username" {...form.field('login')} />
            <TextField label={text.signIn.password} type="password" autoComplete="current-password" {...form.field('password')} />
            <Button type="submit" fullWidth disabled={form.submitting}>
              {text.signIn.submit}
            </Button>
          </Stack>
        </Card>
        <Stack gap={vars.spacing[2]}>
          <Text as="h2" variant="label" color={vars.colors.textMuted}>
            {text.signIn.demoTitle}
          </Text>
          <Text variant="caption" color={vars.colors.textMuted}>
            {text.signIn.demoHint}
          </Text>
          <AsyncContent state={accounts} loading={null}>
            {(list) => (
              <ul className={styles.accounts}>
                {list.map((account) => (
                  <li key={account.username}>
                    <button
                      type="button"
                      className={styles.account}
                      onClick={() => {
                        form.setValue('login', account.username);
                        form.setValue('password', account.password);
                      }}
                    >
                      <span>{account.name}</span>
                      <span>{[localized(account.roleName, locale), account.branch, account.username].filter(Boolean).join(text.common.listSeparator)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AsyncContent>
        </Stack>
      </div>
    </main>
  );
};
