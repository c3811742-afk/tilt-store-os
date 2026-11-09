import { getNotifications, markAllNotificationsOpened } from '@/shared/api';
import { AsyncContent, Button, Card, Icon, Notice, NotificationList, PageHeader, Stack } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { AlertSettingsModal } from './AlertSettingsModal';

// Every alert in one place, marked New until opened. Which alerts are received is in Notification settings (a button in
// the header, as in most apps), not mixed in with the alerts themselves. ?settings=1 opens it (e.g. from My account).
export const NotificationsPage = () => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getNotifications, [version]);
  const action = useAction();
  const [settingsOpen, setSettingsOpen] = useQueryState('settings', '');
  const t = text.owner.notifications;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen('1')}>
              <Icon name="settings" />
              {t.settingsButton}
            </Button>
            <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('all', markAllNotificationsOpened)}>
              {t.markAll}
            </Button>
          </>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(items) => (
          <Card>
            <NotificationList items={items} onError={(error) => action.run('read', () => Promise.reject(error))} />
          </Card>
        )}
      </AsyncContent>
      {settingsOpen && <AlertSettingsModal open onClose={() => setSettingsOpen('')} />}
    </Stack>
  );
};
