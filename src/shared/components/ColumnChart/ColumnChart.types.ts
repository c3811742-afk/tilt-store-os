export interface ColumnChartPoint {
  key: string;
  label: string; // under the column (e.g. a day)
  value: number;
  display: string; // the value as shown in the tooltip, already formatted
  previous?: number; // the same point in the previous period, drawn as a thin marker
}

export interface ColumnChartProps {
  points?: ColumnChartPoint[];
  height?: string;
  color?: string;
  previousColor?: string;
  label?: string; // accessible name of the chart
  labelEvery?: number; // show every Nth label, so long ranges stay readable
  ticks?: number; // about how many steps on the y-axis (rounded to clean numbers)
  barWidth?: string; // the widest a column gets; narrower when many columns share the width
  formatTick?: (value: number, top: number) => string; // a y-axis label; numbers in the active language by default
}
