import { getNotifications, markAllNotificationsOpened } from '@/shared/api';
import { AsyncContent, Button, Notice, NotificationList, PageHeader, Stack } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// The alerts of the signed-in staff member (branch manager, storekeeper, driver, online orders), newest first.
export const StaffNotificationsPage = () => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getNotifications, [version]);
  const action = useAction();
  const t = text.owner.notifications;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('all', markAllNotificationsOpened)}>
            {t.markAll}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(items) => <NotificationList items={items} onError={(error) => action.run('read', () => Promise.reject(error))} />}
      </AsyncContent>
    </Stack>
  );
};
