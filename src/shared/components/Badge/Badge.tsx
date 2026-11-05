import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { badgeDefaults, badgeVariants } from './Badge.defaults';
import type { BadgeProps } from './Badge.types';
import styles from './Badge.module.css';

// A short status label: "Paid", "Overdue", "Paused".
export const Badge = (props: BadgeProps) => {
  const { children, variant, radius } = withDefaults(badgeDefaults, props);
  const style = {
    '--badge-color': badgeVariants[variant].color,
    '--badge-background': badgeVariants[variant].background,
    '--badge-radius': radius,
  } as CSSProperties;
  return (
    <span className={styles.badge} style={style}>
      {children}
    </span>
  );
};
