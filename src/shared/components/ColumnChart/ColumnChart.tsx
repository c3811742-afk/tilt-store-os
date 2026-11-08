import type { CSSProperties } from 'react';
import { useFormat } from '@/shared/hooks';
import { niceTicks, withDefaults } from '@/shared/utils';
import { columnChartDefaults } from './ColumnChart.defaults';
import type { ColumnChartProps } from './ColumnChart.types';
import styles from './ColumnChart.module.css';

const full = 100;

// Columns over time (daily sales), with an optional marker for the previous period at the same point.
// A y-axis with clean steps and faint gridlines gives the scale; hovering or focusing a column shows its value.
export const ColumnChart = (props: ColumnChartProps) => {
  const { points, height, color, previousColor, label, labelEvery, ticks: tickCount, barWidth, slotWidth, formatTick } = withDefaults(columnChartDefaults, props);
  const format = useFormat();
  const max = Math.max(...points.flatMap((point) => [point.value, point.previous ?? 0]), 0);
  const ticks = niceTicks(max, tickCount);
  const top = ticks[ticks.length - 1];
  const percent = (value: number) => `${(Math.max(value, 0) / top) * full}%`;
  const tickText = (value: number) => (formatTick ? formatTick(value, top) : format.axis(value, top));
  const style = {
    '--column-chart-height': height,
    '--column-chart-color': color,
    '--column-chart-previous': previousColor,
    '--column-chart-bar-width': barWidth,
    '--column-chart-slot': slotWidth,
    '--column-chart-count': Math.max(points.length, 1),
  } as CSSProperties;

  return (
    <figure className={styles.chart} style={style} aria-label={label}>
      <div className={styles.axis} aria-hidden>
        {/* Sizes the axis to its widest label; the visible labels are placed on their gridlines. */}
        <span className={styles.axisSizer}>
          {ticks.map((tick) => (
            <span key={tick}>{tickText(tick)}</span>
          ))}
        </span>
        {ticks.map((tick) => (
          <span key={tick} className={styles.tick} style={{ insetBlockEnd: percent(tick) }}>
            {tickText(tick)}
          </span>
        ))}
      </div>
      <div className={styles.plot}>
        {ticks.slice(1).map((tick) => (
          <span key={tick} className={styles.gridline} style={{ insetBlockEnd: percent(tick) }} aria-hidden />
        ))}
        {points.map((point) => (
          <div key={point.key} className={styles.column} tabIndex={0} aria-label={`${point.label}: ${point.display}`} role="img">
            <div className={styles.bar} style={{ blockSize: percent(point.value) }} />
            {point.previous !== undefined && <div className={styles.previous} style={{ insetBlockEnd: percent(point.previous) }} />}
            <span className={styles.tip} style={{ insetBlockEnd: percent(point.value) }} aria-hidden>
              <span className={styles.tipLabel}>{point.label}</span>
              {point.display}
            </span>
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
