import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { columnChartDefaults } from './ColumnChart.defaults';
import type { ColumnChartProps } from './ColumnChart.types';
import styles from './ColumnChart.module.css';

const full = 100;

// Columns over time (daily sales), with an optional marker for the previous period at the same point.
// Each column's value is in its title (hover) and in the accessible label.
export const ColumnChart = (props: ColumnChartProps) => {
  const { points, height, color, previousColor, label, labelEvery } = withDefaults(columnChartDefaults, props);
  const max = Math.max(...points.flatMap((point) => [point.value, point.previous ?? 0]), 0);
  const percent = (value: number) => `${max ? (Math.max(value, 0) / max) * full : 0}%`;
  const style = {
    '--column-chart-height': height,
    '--column-chart-color': color,
    '--column-chart-previous': previousColor,
  } as CSSProperties;

  return (
    <figure className={styles.chart} style={style} aria-label={label}>
      <div className={styles.columns}>
        {points.map((point) => (
          <div key={point.key} className={styles.column} title={`${point.label}: ${point.display}`} aria-label={`${point.label}: ${point.display}`} role="img">
            <div className={styles.bar} style={{ blockSize: percent(point.value) }} />
            {point.previous !== undefined && <div className={styles.previous} style={{ insetBlockEnd: percent(point.previous) }} />}
          </div>
        ))}
      </div>
      <div className={styles.labels} aria-hidden>
        {points.map((point, index) => (
          <span key={point.key} className={styles.label}>
            {index % labelEvery === 0 ? point.label : ''}
          </span>
        ))}
      </div>
    </figure>
  );
};
