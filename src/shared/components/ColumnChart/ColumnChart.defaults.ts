import { vars } from '@/shared/theme';
import type { ColumnChartProps } from './ColumnChart.types';

export const columnChartDefaults: Required<Pick<ColumnChartProps, 'points' | 'height' | 'color' | 'previousColor' | 'labelEvery'>> = {
  points: [],
  height: vars.sizes.bar.chartHeight,
  color: vars.colors.primary,
  previousColor: vars.colors.borderStrong,
  labelEvery: 1,
};
