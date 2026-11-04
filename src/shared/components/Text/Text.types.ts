import type { ReactNode } from 'react';
import type { Theme } from '@/shared/theme';

export type TextVariant = keyof Theme['typography']['textStyles'];
export type TextElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'label';

export interface TextProps {
  children?: ReactNode;
  as?: TextElement;
  variant?: TextVariant;
  color?: string;
  align?: 'start' | 'center' | 'end';
  autoDirection?: boolean; // for user-generated text that may be in either language
}
