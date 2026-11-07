import { cx, withDefaults } from '@/shared/utils';
import { vars } from '@/shared/theme';
import { Text } from '../Text';
import { statusTimelineDefaults } from './StatusTimeline.defaults';
import type { StatusTimelineProps } from './StatusTimeline.types';
import styles from './StatusTimeline.module.css';

// The steps of a record (a transfer, an online order): done, current, still to come, or stopped.
export const StatusTimeline = (props: StatusTimelineProps) => {
  const { steps, label } = withDefaults(statusTimelineDefaults, props);
  return (
    <ol className={styles.timeline} aria-label={label}>
      {steps.map((step) => (
        <li key={step.key} className={cx(styles.step, styles[step.state])} aria-current={step.state === 'current' ? 'step' : undefined}>
          <span className={styles.dot} aria-hidden />
          <span className={styles.text}>
            <Text as="span" variant="bodySm" color={step.state === 'upcoming' ? vars.colors.textMuted : vars.colors.text}>
              {step.label}
            </Text>
            {step.detail && (
              <Text as="span" variant="caption" color={vars.colors.textMuted}>
                {step.detail}
              </Text>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
};
