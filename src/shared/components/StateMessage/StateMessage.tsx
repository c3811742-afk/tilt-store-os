import type { CSSProperties } from 'react';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { Text } from '../Text';
import { stateMessageDefaults } from './StateMessage.defaults';
import type { StateMessageProps } from './StateMessage.types';
import styles from './StateMessage.module.css';

// Shared layout behind LoadingState, ErrorState, EmptyState and the "Page not found" page.
export const StateMessage = (props: StateMessageProps) => {
  const { title, message, icon, actions, role, minHeight, maxWidth } = withDefaults(stateMessageDefaults, props);

  const style = {
    '--state-message-min-height': minHeight,
    '--state-message-max-width': maxWidth,
  } as CSSProperties;

  return (
    <div className={styles.stateMessage} style={style} role={role}>
      {icon}
      {(title || message) && (
        <div className={styles.text}>
          {title && (
            <Text as="h2" variant="h3" align="center">
              {title}
            </Text>
          )}
          {message && (
            <Text align="center" color={vars.colors.textMuted}>
              {message}
            </Text>
          )}
        </div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};
