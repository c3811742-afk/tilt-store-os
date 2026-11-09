import { Link } from 'react-router';
import { getNotifications, markNotificationsOpened } from '@/shared/api';
import { useAlertText, useAsync, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, formatNumber, safeAsync, withDefaults } from '@/shared/utils';
import { IconButton } from '../IconButton';
import { Menu } from '../Menu';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { notificationBellDefaults } from './NotificationBell.defaults';
import type { NotificationBellProps } from './NotificationBell.types';
import styles from './NotificationBell.module.css';

// The bell in the top bar: the number of new alerts on it (99+ above 99), the latest alerts in a menu.
export const NotificationBell = (props: NotificationBellProps) => {
  const { viewAllPath, latestCount, maxCount } = withDefaults(notificationBellDefaults, props);
  const { text, locale } = useLocale();
  const version = useLiveVersion();
  const state = useAsync(getNotifications, [version]);
  const alertText = useAlertText();
  const list = state.status === 'success' ? state.data : [];
  const fresh = list.filter((item) => !item.opened).length;

  return (
    <Menu
      minWidth={vars.sizes.modal.width}
      trigger={({ open, toggle }) => (
        <span className={styles.bell}>
          <IconButton icon="bell" label={`${text.shell.notifications}${fresh ? `, ${fillText(text.shell.newCount, { count: fresh })}` : ''}`} onClick={toggle} expanded={open} />
          {fresh > 0 && (
            <span className={styles.count} aria-hidden>
              {fresh > maxCount ? `${formatNumber(maxCount, locale)}+` : formatNumber(fresh, locale)}
            </span>
          )}
        </span>
      )}
      header={
        <Stack direction="row" justify="space-between" align="center">
          <Text as="span" variant="h4">
            {text.shell.notifications}
          </Text>
          <Link to={viewAllPath}>{text.common.viewAll}</Link>
        </Stack>
      }
      items={list.slice(0, latestCount).map((item) => ({
        key: item.id,
        label: alertText(item).title,
        icon: item.opened ? undefined : 'alert',
        to: item.link,
        onSelect: () => void safeAsync(() => markNotificationsOpened([item.id])),
      }))}
    />
  );
};
