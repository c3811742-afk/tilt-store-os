import { useState } from 'react';
import { getNotifications, markAllNotificationsOpened, setOwnerAlerts } from '@/shared/api';
import { AsyncContent, Button, Card, Checkbox, Notice, NotificationList, PageHeader, Stack, Tabs, Text } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import type { AlertKind } from '@/shared/types';
import { vars } from '@/shared/theme';

type NotificationsTab = 'all' | 'settings';

// Every alert in one place, marked New until opened, and which alerts the owners receive.
export const NotificationsPage = () => {
  const { text } = useLocale();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getNotifications, [version]);
  const action = useAction();
  const [tab, setTab] = useQueryState<NotificationsTab>('tab', 'all');
  const [alerts, setAlerts] = useState<Record<AlertKind, boolean> | null>(null);
  const t = text.owner.notifications;
  const current = alerts ?? settings.ownerAlerts;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} actions={<Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('all', markAllNotificationsOpened)}>{t.markAll}</Button>} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<NotificationsTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: t.tabs.all, count: state.status === 'success' ? state.data.filter((item) => !item.opened).length : undefined },
          { value: 'settings', label: t.tabs.settings },
        ]}
      >
        {tab === 'all' && (
          <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
            {(items) => <NotificationList items={items} onError={(error) => action.run('read', () => Promise.reject(error))} />}
          </AsyncContent>
        )}
        {tab === 'settings' && (
          <Card
            title={t.tabs.settings}
            actions={
              <Button size="sm" disabled={!alerts || Boolean(action.busy)} onClick={async () => { if (alerts && (await action.run('save', () => setOwnerAlerts(alerts)))) setAlerts(null); }}>
                {text.common.saveChanges}
              </Button>
            }
          >
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {t.settingsHint}
            </Text>
            {(Object.keys(current) as AlertKind[]).map((kind) => (
              <Checkbox key={kind} label={t.kinds[kind]} checked={current[kind]} onChange={(checked) => setAlerts({ ...current, [kind]: checked })} />
            ))}
          </Card>
        )}
      </Tabs>
    </Stack>
  );
};
