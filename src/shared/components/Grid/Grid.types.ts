import type { ReactNode } from 'react';

export interface GridProps {
  children?: ReactNode;
  minColumnWidth?: string; // columns are at least this wide; as many fit as the screen allows
  gap?: string;
  as?: 'div' | 'ul' | 'section';
}
