import { useConnection, useLocale } from '@/shared/hooks';
import { fillText } from '@/shared/utils';
import styles from './AppFrame.module.css';

// A line under the top bar while offline, with the number of changes waiting to sync.
export const ConnectionBanner = () => {
  const { text } = useLocale();
  const { offline, pending } = useConnection();
  if (offline) {
    return (
      <p className={styles.offline} role="status">
        {fillText(text.shell.offline, { count: pending })}
      </p>
    );
  }
  if (pending) {
    return (
      <p className={styles.syncing} role="status">
        {fillText(text.shell.syncing, { count: pending })}
      </p>
    );
  }
  return null;
};
