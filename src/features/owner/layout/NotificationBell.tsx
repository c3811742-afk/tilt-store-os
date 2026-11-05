import { Link } from 'react-router';
import { getNotifications, markNotificationsOpened } from '@/shared/api';
import { IconButton, Menu, Stack, Text } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAsync, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';
import { useAlertText } from '../hooks/useAlertText';
import styles from './OwnerLayout.module.css';

const latestCount = 6;

// The bell in the top bar: a red dot when something is new, the latest alerts in a menu.
export const NotificationBell = () => {
  const { text } = useLocale();
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
          {fresh > 0 && <span className={styles.dot} />}
        </span>
      )}
      header={
        <Stack direction="row" justify="space-between" align="center">
          <Text as="span" variant="h4">
            {text.shell.notifications}
          </Text>
          <Link to={routes.owner.notifications}>{text.common.viewAll}</Link>
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
