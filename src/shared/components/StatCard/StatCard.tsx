import type { CSSProperties } from 'react';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { Card } from '../Card';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { statCardDefaults, statCardTrendColors } from './StatCard.defaults';
import type { StatCardProps } from './StatCard.types';
import styles from './StatCard.module.css';

const trendIcons = { up: 'trendUp', down: 'trendDown' } as const;

// One key number with its name and a short line of context.
export const StatCard = (props: StatCardProps) => {
  const { label, value, detail, trend, to, highlight, minHeight } = withDefaults(statCardDefaults, props);
  const style = {
    '--stat-card-min-height': minHeight,
    '--stat-card-trend': trend ? statCardTrendColors[trend] : vars.colors.textMuted,
  } as CSSProperties;

  return (
    <Card to={to} accentColor={highlight ? vars.colors.brand : undefined} gap={vars.spacing[2]}>
      <div className={styles.body} style={style}>
        <Text as="span" variant="label" color={vars.colors.textMuted}>
          {label}
        </Text>
        <span className={styles.value}>
          <Text as="span" variant="stat">
            {value}
          </Text>
        </span>
        {detail && (
          <span className={styles.detail}>
            {trend && trend !== 'flat' && <Icon name={trendIcons[trend]} />}
            <Text as="span" variant="caption" color="inherit">
              {detail}
            </Text>
          </span>
        )}
      </div>
    </Card>
  );
};
