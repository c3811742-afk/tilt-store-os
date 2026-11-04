import type { ReactNode } from 'react';

export interface ContainerProps {
  children?: ReactNode;
  as?: 'div' | 'main' | 'section' | 'header' | 'footer';
  maxWidth?: string;
  paddingX?: string;
}
