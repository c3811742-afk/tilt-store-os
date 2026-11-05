import type { ReactNode } from 'react';

export interface DetailItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DetailListProps {
  items?: DetailItem[];
  minColumnWidth?: string; // label and value side by side above this width
}
