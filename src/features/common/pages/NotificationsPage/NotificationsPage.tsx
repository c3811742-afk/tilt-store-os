import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getNotifications, markAllNotificationsOpened, markNotificationsOpened, setMyMutedAlerts, setOwnerAlerts } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Checkbox, IconButton, Notice, PageHeader, Stack, Tabs, Text } from '@/shared/components';
import { useAction, useAlertText, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState, useReference, useSession } from '@/shared/hooks';
import { alertsByRole } from '@/shared/constants';
import type { AlertKind } from '@/shared/types';
import { vars } from '@/shared/theme';


type NotificationsTab = 'all' | 'settings';

// Every alert in one place, marked New until opened, and which alerts are received: owners choose for all owners,
// everyone else for themselves.
export const NotificationsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getNotifications, [version]);
  const action = useAction();
  const alertText = useAlertText();
  const [tab, setTab] = useQueryState<NotificationsTab>('tab', 'all');
  const [alerts, setAlerts] = useState<Record<AlertKind, boolean> | null>(null);
  const t = text.owner.notifications;
  const current = alerts ?? settings.ownerAlerts;
  const { session, setSession } = useSession();
  const [muted, setMuted] = useState<AlertKind[] | null>(null);
  const myKinds = [...new Set((session?.roles ?? []).flatMap((role) => alertsByRole[role] ?? []))];
  const myMuted = muted ?? session?.user.mutedAlerts ?? [];

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
            {(items) => (
              <Stack gap={vars.spacing[2]}>
                {items.map((item) => {
                  const copy = alertText(item);
                  return (
                    <Card
                      key={item.id}
                      gap={vars.spacing[1]}
                      title={copy.title}
                      actions={
                        <>
                          <Badge variant={item.opened ? 'neutral' : 'brand'}>{item.opened ? t.opened : t.new}</Badge>
                          {!item.opened && <IconButton icon="check" label={t.markRead} onClick={() => action.run(item.id, () => markNotificationsOpened([item.id]))} />}
                          <IconButton
                            icon="arrowEnd"
                            label={text.common.view}
                            onClick={async () => {
                              await action.run(`open-${item.id}`, () => markNotificationsOpened([item.id]));
                              navigate(item.link);
                            }}
                          />
                        </>
                      }
                    >
                      <Text variant="bodySm" color={vars.colors.textSecondary}>
                        {copy.body}
                      </Text>
                      <Text variant="caption" color={vars.colors.textMuted}>
                        {format.dateTime(item.at)}
                      </Text>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </AsyncContent>
        )}
        {tab === 'settings' && !session?.isOwner && (
          <Card
            title={t.tabs.settings}
            actions={
              <Button
                size="sm"
                disabled={!muted || Boolean(action.busy)}
                onClick={async () => {
                  const next = muted && (await action.run('saveMine', () => setMyMutedAlerts(muted)));
                  if (next) {
                    setSession(next);
                    setMuted(null);
                  }
                }}
              >
                {text.common.saveChanges}
              </Button>
            }
          >
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {text.account.alertsHint}
            </Text>
            {myKinds.map((kind) => (
              <Checkbox key={kind} label={t.kinds[kind]} checked={!myMuted.includes(kind)} onChange={(checked) => setMuted(checked ? myMuted.filter((current) => current !== kind) : [...myMuted, kind])} />
            ))}
          </Card>
        )}
        {tab === 'settings' && session?.isOwner && (
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
