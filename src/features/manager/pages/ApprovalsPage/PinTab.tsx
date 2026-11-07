import { useState } from 'react';
import { getOwnPinState, setOwnApprovalPin } from '@/shared/api';
import { AsyncContent, Button, Card, Notice, Stack, Text, TextField } from '@/shared/components';
import { useAsync, useErrorMessage, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync } from '@/shared/utils';

const pinPattern = /^\d{4}$/;

// The manager sets or changes their own 4-digit approval PIN. Changing it needs the current PIN.
export const PinTab = () => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const state = useAsync(getOwnPinState, [], () => false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; repeat?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const t = text.manager.approvals;

  return (
    <AsyncContent state={state}>
      {(pinState) => {
        const submit = async () => {
          const found = {
            current: pinState.hasPin && !pinPattern.test(current) ? text.validation.pin : undefined,
            next: pinPattern.test(next) ? undefined : text.validation.pin,
            repeat: next === repeat ? undefined : t.pinMismatch,
          };
          setErrors(found);
          setSaved(false);
          if (found.current || found.next || found.repeat) return;
          setBusy(true);
          setError(null);
          const result = await safeAsync(() => setOwnApprovalPin(current, next));
          setBusy(false);
          setCurrent('');
          if (!result.ok) return setError(result.error);
          setNext('');
          setRepeat('');
          setSaved(true);
          state.retry();
        };
        return (
          <Card title={t.pinTitle}>
            <Stack
              as="form"
              gap={vars.spacing[4]}
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {t.pinHint}
              </Text>
              {pinState.locked ? <Notice tone="warning">{t.pinLocked}</Notice> : <Notice>{pinState.hasPin ? t.pinSet : t.pinNotSet}</Notice>}
              {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
              {saved && <Notice tone="success">{t.pinSaved}</Notice>}
              {pinState.hasPin && <TextField label={t.currentPin} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={current} onChange={setCurrent} error={errors.current} width={vars.sizes.field.narrow} />}
              <TextField label={t.newPin} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={next} onChange={setNext} error={errors.next} width={vars.sizes.field.narrow} />
              <TextField label={t.confirmPin} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={repeat} onChange={setRepeat} error={errors.repeat} width={vars.sizes.field.narrow} />
              <Stack direction="row" justify="flex-end">
                <Button type="submit" disabled={busy || pinState.locked}>
                  {t.savePin}
                </Button>
              </Stack>
            </Stack>
          </Card>
        );
      }}
    </AsyncContent>
  );
};
