import type { ReactNode } from 'react';

export type Trend = 'up' | 'down' | 'flat';

export interface StatCardProps {
  label?: string; // what the number is, e.g. "Net sales"
  value?: string; // already formatted, e.g. "EGP 412,300"
  detail?: ReactNode; // a muted line under the number, e.g. "Up 4.8% from last week"
  trend?: Trend; // colors the detail and shows an arrow before it
  to?: string; // makes the card a link to the page behind the number
  highlight?: boolean; // the green edge: the one number that matters most on the screen
  minHeight?: string;
}
