import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { noticeDefaults, noticeTones } from './Notice.defaults';
import type { NoticeProps } from './Notice.types';
import styles from './Notice.module.css';

// An inline message on a page: a warning before an action, a confirmation after it.
export const Notice = (props: NoticeProps) => {
  const { children, tone, title, action } = withDefaults(noticeDefaults, props);
  const { color, icon } = noticeTones[tone];
  return (
    <div className={styles.notice} style={{ '--notice-color': color } as CSSProperties} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className={styles.icon}>
        <Icon name={icon} />
      </span>
      <div className={styles.body}>
        {title && (
          <Text as="span" variant="h4">
            {title}
          </Text>
        )}
        {children && (
          <Text as="span" variant="bodySm">
            {children}
          </Text>
        )}
      </div>
      {action}
    </div>
  );
};
