import type { ReactNode } from 'react';

export interface GridProps {
  children?: ReactNode;
  minColumnWidth?: string; // columns are at least this wide; as many fit as the screen allows
  columns?: number; // instead: exactly this many equal columns on a laptop (two on a tablet, one on a phone)
  alignItems?: 'stretch' | 'start'; // start: each item keeps its own height (cards of different lengths side by side)
  gap?: string;
  as?: 'div' | 'ul' | 'section';
}
