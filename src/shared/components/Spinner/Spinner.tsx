import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { spinnerDefaults } from './Spinner.defaults';
import type { SpinnerProps } from './Spinner.types';
import styles from './Spinner.module.css';

// Decorative only: the surrounding LoadingState announces the loading text to screen readers.
export const Spinner = (props: SpinnerProps) => {
  const { size, color, trackColor } = withDefaults(spinnerDefaults, props);

  const style = {
    '--spinner-size': size,
    '--spinner-color': color,
    '--spinner-track-color': trackColor,
  } as CSSProperties;

  return <span className={styles.spinner} style={style} aria-hidden="true" />;
};
