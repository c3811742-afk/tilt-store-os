import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { dismissNotifications, markNotificationsOpened } from '@/shared/api';
import type { NotificationView } from '@/shared/api';
import { useAlertText, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, fillText, safeAsync, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { notificationListDefaults } from './NotificationList.defaults';
import type { NotificationListProps } from './NotificationList.types';
import styles from './NotificationList.module.css';

// A row that can be swiped sideways to dismiss it (fingers and pens; a mouse uses the Dismiss button). Past
// `threshold` of its width it slides out and is dismissed; short of it, it slides back.
const SwipeRow = ({ children, onDismiss, threshold, className }: { children: ReactNode; onDismiss: () => void; threshold: number; className?: string }) => {
  const [shift, setShift] = useState(0); // in % of the row's width
  const [gone, setGone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const percent = (event: PointerEvent<HTMLLIElement>) => ((event.clientX - (start.current ?? event.clientX)) / Math.max(event.currentTarget.offsetWidth, 1)) * 100;
  return (
    <li
      className={cx(className, styles.swipe, dragging && styles.dragging)}
      style={{ '--swipe-shift': `${gone ? Math.sign(shift || 1) * 100 : shift}%` } as CSSProperties}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse') return;
        start.current = event.clientX;
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (start.current !== null) setShift(percent(event));
      }}
      onPointerUp={(event) => {
        if (start.current === null) return;
        const moved = percent(event);
        start.current = null;
        setDragging(false);
        if (Math.abs(moved) >= threshold * 100) {
          setShift(moved);
          setGone(true);
          onDismiss();
        } else setShift(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDragging(false);
        setShift(0);
      }}
    >
      {children}
    </li>
  );
};

// Alerts still to review, as rows of one list separated by thin lines (put it in a Card), compact: the title, then the
// text and time on one line. Alerts of the same kind fold into the newest one ("3 more like this" opens them), and
// the list shows a page of them with See more. Viewing or Mark as read keeps an alert (no longer New); Dismiss or a
// swipe removes it.
export const NotificationList = (props: NotificationListProps) => {
  const { items, gap, onError, pageSize, swipeThreshold } = withDefaults(notificationListDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const alertText = useAlertText();
  const [shown, setShown] = useState(pageSize);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const t = text.owner.notifications;

  const run = async (call: () => Promise<unknown>) => {
    const result = await safeAsync(call);
    if (!result.ok) onError?.(result.error);
    return result.ok;
  };
  const dismiss = (ids: string[]) => run(() => dismissNotifications(ids));
  const markRead = (ids: string[]) => run(() => markNotificationsOpened(ids));

  // Newest first, one group per kind, in the order its newest alert came.
  const groups: NotificationView[][] = [];
  items.forEach((item) => {
    const group = groups.find((current) => current[0].kind === item.kind);
    if (group) group.push(item);
    else groups.push([item]);
  });

  const row = (item: NotificationView, group: NotificationView[] | null, nested = false) => {
    const copy = alertText(item);
    const ids = group ? group.map((current) => current.id) : [item.id];
    // A folded group is New while any alert in it is.
    const unread = (group ?? [item]).filter((current) => !current.opened).map((current) => current.id);
    const open = group ? openGroups.includes(item.kind) : false;
    return (
      <SwipeRow key={item.id} className={cx(styles.row, nested && styles.nested)} threshold={swipeThreshold} onDismiss={() => void dismiss(ids)}>
        <div className={styles.content}>
          <Text as="span" variant={unread.length ? 'button' : 'bodySm'}>
            {copy.title}
          </Text>
          <Text as="span" variant="caption" color={vars.colors.textSecondary}>
            {`${copy.body} · ${format.dateTime(item.at)}`}
          </Text>
          {group && group.length > 1 && (
            <span>
              <Button size="sm" variant="muted" onClick={() => setOpenGroups(open ? openGroups.filter((kind) => kind !== item.kind) : [...openGroups, item.kind])}>
                {open ? t.showLess : fillText(t.moreLikeThis, { count: format.number(group.length - 1) })}
              </Button>
            </span>
          )}
        </div>
        {/* New and Mark as read come before Dismiss and View, which always keep their place at the end. */}
        <div className={styles.actions}>
          {unread.length > 0 && <Badge variant="brand">{t.new}</Badge>}
          {unread.length > 0 && <IconButton icon="check" label={t.markRead} onClick={() => void markRead(unread)} />}
          <IconButton icon="close" label={t.dismiss} onClick={() => void dismiss(ids)} />
          <IconButton
            icon="arrowEnd"
            label={text.common.view}
            onClick={async () => {
              await markRead([item.id]); // viewing reads it; it stays in the list
              navigate(item.link);
            }}
          />
        </div>
      </SwipeRow>
    );
  };

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list} style={{ '--notification-list-gap': gap } as CSSProperties}>
        {groups.slice(0, shown).flatMap((group) => [row(group[0], group), ...(openGroups.includes(group[0].kind) ? group.slice(1).map((item) => row(item, null, true)) : [])])}
      </ul>
      {groups.length > shown && (
        <Button size="sm" variant="secondary" onClick={() => setShown(shown + pageSize)}>
          {t.seeMore}
        </Button>
      )}
    </div>
  );
};
