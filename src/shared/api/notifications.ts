import type { AlertKind, AppNotification } from '@/shared/types';
import { actor, db, mutate, respond } from './server';

export interface NotificationView extends Omit<AppNotification, 'userIds' | 'openedBy'> {
  opened: boolean;
}

// The signed-in user's alerts, newest first, each marked "New" until opened.
export const getNotifications = () =>
  respond((): NotificationView[] => {
    const me = actor().id;
    return db.notifications
      .filter((item) => item.userIds.includes(me))
      .map(({ userIds: _userIds, openedBy, ...item }) => ({ ...item, opened: openedBy.includes(me) }));
  });

export const markNotificationsOpened = (ids: string[]) =>
  mutate(() => {
    const me = actor().id;
    db.notifications.forEach((item) => {
      if (ids.includes(item.id) && !item.openedBy.includes(me)) item.openedBy.push(me);
    });
    return true;
  });

export const markAllNotificationsOpened = () =>
  mutate(() => {
    const me = actor().id;
    db.notifications.forEach((item) => {
      if (item.userIds.includes(me) && !item.openedBy.includes(me)) item.openedBy.push(me);
    });
    return true;
  });

// Which alerts the owners receive (Alerts settings).
export const setOwnerAlerts = (alerts: Record<AlertKind, boolean>) =>
  mutate(() => {
    db.settings.ownerAlerts = alerts;
    return db.settings.ownerAlerts;
  });
