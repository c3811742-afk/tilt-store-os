import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { infoTipDefaults } from './InfoTip.defaults';
import type { InfoTipProps } from './InfoTip.types';
import styles from './InfoTip.module.css';

// An (i) beside a label that says what that data is, on hover or focus. Definitions only: no instructions.
export const InfoTip = (props: InfoTipProps) => {
  const { text, label } = withDefaults(infoTipDefaults, props);
  const { text: copy } = useLocale();
  if (!text) return null;
  return (
    <span className={styles.tip} tabIndex={0} role="note" aria-label={`${label ?? copy.common.moreInfo}: ${text}`}>
      <Icon name="info" />
      <span className={styles.bubble} aria-hidden>
        {text}
      </span>
    </span>
  );
};
