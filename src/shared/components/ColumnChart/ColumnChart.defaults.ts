import { vars } from '@/shared/theme';
import type { ColumnChartProps } from './ColumnChart.types';

export const columnChartDefaults: Required<Pick<ColumnChartProps, 'points' | 'height' | 'color' | 'previousColor' | 'labelEvery' | 'ticks' | 'barWidth' | 'slotWidth'>> = {
  points: [],
  height: vars.sizes.bar.chartHeight,
  color: vars.colors.primary,
  previousColor: vars.colors.borderStrong,
  labelEvery: 1,
  ticks: 4,
  barWidth: vars.sizes.bar.columnWidth,
  slotWidth: vars.sizes.bar.columnSlot,
};
