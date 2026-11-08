import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { demoAccounts, signIn, signInWithPin, type DemoAccount } from '@/shared/api';
import { AsyncContent, BrandLogo, Button, Card, Notice, PinPad, SegmentedControl, Stack, Text, TextField } from '@/shared/components';
import { accountDefaults, routes } from '@/shared/constants';
import { useAppearance, useAsync, useErrorMessage, useForm, useLocale, useQueryState, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';
import styles from './SignInPage.module.css';

type SignInMode = 'password' | 'pin';

// Sign in with a username or email and password, or with a PIN on a shared till. After an automatic
// log-out or "Switch account", the PIN keypad opens with a short note.
export const SignInPage = () => {
  const { text, switchLocale } = useLocale();
  const { appearance, switchAppearance } = useAppearance();
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const accounts = useAsync(demoAccounts, []);
  const [mode, setMode] = useQueryState<SignInMode>('mode', 'password');
  const [reason] = useQueryState<'' | 'idle' | 'switch'>('reason', '');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<unknown>(null);
  const required = (value: string) => (value.trim() ? null : text.validation.required);
  const form = useForm({ login: '', password: '' }, { login: required, password: required });

  if (session) return <Navigate to={routes.home} replace />;

  const onSubmit = form.submit(async ({ login, password }) => {
    setSession(await signIn(login, password));
    navigate(routes.home);
  });

  const onPin = async (value: string) => {
    setPinBusy(true);
    setPinError(null);
    const result = await safeAsync(() => signInWithPin(value));
    setPinBusy(false);
    setPin('');
    if (!result.ok) return setPinError(result.error);
    setSession(result.data);
    navigate(routes.home);
  };

  const pick = (account: DemoAccount) => {
    if (mode === 'pin' && account.pin) return void onPin(account.pin);
    form.setValue('login', account.username);
    form.setValue('password', account.password);
  };

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
        {reason === 'idle' && <Notice tone="info">{fillText(text.signIn.idle, { minutes: accountDefaults.idleLogoutMinutes })}</Notice>}
        {reason === 'switch' && <Notice tone="info">{text.signIn.switching}</Notice>}
        <Card>
          <Stack gap={vars.spacing[4]}>
            <Stack gap={vars.spacing[1]}>
              <Text as="h1" variant="h2">
                {text.signIn.title}
              </Text>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {mode === 'pin' ? text.signIn.pinHint : text.signIn.subtitle}
              </Text>
            </Stack>
            <SegmentedControl<SignInMode>
              label={text.signIn.title}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'password', label: text.signIn.tabs.password },
                { value: 'pin', label: text.signIn.tabs.pin },
              ]}
            />
            {mode === 'password' ? (
              <Stack as="form" onSubmit={onSubmit} gap={vars.spacing[4]}>
                {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
                <TextField label={text.signIn.login} autoComplete="username" {...form.field('login')} />
                <TextField label={text.signIn.password} type="password" autoComplete="current-password" {...form.field('password')} />
                <Button type="submit" fullWidth disabled={form.submitting}>
                  {text.signIn.submit}
                </Button>
                <div>
                  <Button variant="muted" size="sm" onClick={() => setForgotOpen(!forgotOpen)}>
                    {text.signIn.forgot}
                  </Button>
                </div>
                {forgotOpen && <Notice tone="info">{text.signIn.forgotHint}</Notice>}
              </Stack>
            ) : (
              <PinPad label={text.signIn.pin} value={pin} onChange={setPin} onComplete={(value) => void onPin(value)} disabled={pinBusy} error={pinError ? errorMessage(pinError) : undefined} />
            )}
          </Stack>
        </Card>
        <Stack gap={vars.spacing[2]}>
          <Text as="h2" variant="label" color={vars.colors.textMuted}>
            {text.signIn.demoTitle}
          </Text>
          <Text variant="caption" color={vars.colors.textMuted}>
            {text.signIn.demoAll}
          </Text>
          <AsyncContent state={accounts} loading={null}>
            {(list) => (
              <ul className={styles.accounts}>
                {list
                  .filter((account) => mode === 'password' || account.pin)
                  .map((account) => (
                    <li key={account.username}>
                      <button type="button" className={styles.account} onClick={() => pick(account)}>
                        <span className={styles.who}>
                          <span>{account.name}</span>
                          <span className={styles.role}>{[text.signIn.roles[account.role], account.branch].filter(Boolean).join(text.common.listSeparator)}</span>
                        </span>
                        <span className={styles.how}>
                          {mode === 'pin' ? fillText(text.signIn.demoPin, { pin: account.pin }) : account.username}
                          {mode === 'password' && account.temporary && <span className={styles.role}>{text.signIn.demoFirstLogin}: {account.password}</span>}
                        </span>
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
