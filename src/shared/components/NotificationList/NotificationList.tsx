import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { markNotificationsOpened } from '@/shared/api';
import { useAlertText, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { notificationListDefaults } from './NotificationList.defaults';
import type { NotificationListProps } from './NotificationList.types';
import styles from './NotificationList.module.css';

// Alerts as rows of one list, separated by thin lines (put it in a Card): each marked New until opened, with
// "Mark as read" and a link to the page it is about.
export const NotificationList = (props: NotificationListProps) => {
  const { items, gap, onError } = withDefaults(notificationListDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const alertText = useAlertText();
  const t = text.owner.notifications;

  const markRead = async (id: string) => {
    const result = await safeAsync(() => markNotificationsOpened([id]));
    if (!result.ok) onError?.(result.error);
    return result.ok;
  };

  return (
    <ul className={styles.list} style={{ '--notification-list-gap': gap } as CSSProperties}>
      {items.map((item) => {
        const copy = alertText(item);
        return (
          <li key={item.id} className={styles.row}>
            <div className={styles.content}>
              <Text as="span" variant="h4">
                {copy.title}
              </Text>
              <Text as="span" variant="bodySm" color={vars.colors.textSecondary}>
                {copy.body}
              </Text>
              <Text as="span" variant="caption" color={vars.colors.textMuted}>
                {format.dateTime(item.at)}
              </Text>
            </div>
            <div className={styles.actions}>
              <Badge variant={item.opened ? 'neutral' : 'brand'}>{item.opened ? t.opened : t.new}</Badge>
              {!item.opened && <IconButton icon="check" label={t.markRead} onClick={() => void markRead(item.id)} />}
              <IconButton
                icon="arrowEnd"
                label={text.common.view}
                onClick={async () => {
                  await markRead(item.id);
                  navigate(item.link);
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
