import type { AlertKind, AppNotification } from '@/shared/types';
import { safeAsync } from '@/shared/utils';
import { remindPausedBrands } from './pausedBrands';
import { actor, db, mutate, respond } from './server';

export interface NotificationView extends Omit<AppNotification, 'userIds' | 'openedBy' | 'dismissedBy'> {
  opened: boolean;
}

// The signed-in user's alerts, newest first, each New until read. Reading one keeps it in the list; dismissing it
// (× or a swipe, as in a phone's notification centre) removes it.
export const getNotifications = async () => {
  // Today's reminders come first; if adding them fails, the alerts already there still show (it runs again next time).
  const reminded = await safeAsync(remindPausedBrands);
  if (!reminded.ok) console.error(reminded.error);
  return respond((): NotificationView[] => {
    const me = actor().id;
    return db.notifications
      .filter((item) => item.userIds.includes(me) && !item.dismissedBy?.includes(me))
      .map(({ userIds: _userIds, openedBy, dismissedBy: _dismissedBy, ...item }) => ({ ...item, opened: openedBy.includes(me) }));
  });
};

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

// Removes alerts from the list (they count as read too).
export const dismissNotifications = (ids: string[]) =>
  mutate(() => {
    const me = actor().id;
    db.notifications.forEach((item) => {
      if (!ids.includes(item.id)) return;
      if (!item.openedBy.includes(me)) item.openedBy.push(me);
      item.dismissedBy = [...(item.dismissedBy ?? []).filter((id) => id !== me), me];
    });
    return true;
  });

// Removes every read alert from the list; new ones stay.
export const clearReadNotifications = () =>
  mutate(() => {
    const me = actor().id;
    db.notifications.forEach((item) => {
      if (item.userIds.includes(me) && item.openedBy.includes(me) && !item.dismissedBy?.includes(me)) item.dismissedBy = [...(item.dismissedBy ?? []), me];
    });
    return true;
  });

// Which alerts the owners receive (Alerts settings).
export const setOwnerAlerts = (alerts: Record<AlertKind, boolean>) =>
  mutate(() => {
    db.settings.ownerAlerts = alerts;
    return db.settings.ownerAlerts;
  });
