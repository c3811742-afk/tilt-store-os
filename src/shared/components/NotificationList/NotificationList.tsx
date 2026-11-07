import { useNavigate } from 'react-router';
import { markNotificationsOpened } from '@/shared/api';
import { useAlertText, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { IconButton } from '../IconButton';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { notificationListDefaults } from './NotificationList.defaults';
import type { NotificationListProps } from './NotificationList.types';

// Alerts as cards, marked New until opened, each with "Mark as read" and a link to the page it is about.
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
    <Stack gap={gap}>
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
                {!item.opened && <IconButton icon="check" label={t.markRead} onClick={() => void markRead(item.id)} />}
                <IconButton
                  icon="arrowEnd"
                  label={text.common.view}
                  onClick={async () => {
                    await markRead(item.id);
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
  );
};
