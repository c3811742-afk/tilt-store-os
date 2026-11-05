import type { FormEvent, ReactNode } from 'react';

export interface StackProps {
  children?: ReactNode;
  as?: 'div' | 'section' | 'ul' | 'ol' | 'li' | 'nav' | 'form' | 'header';
  direction?: 'column' | 'row';
  gap?: string;
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  wrap?: boolean;
  grow?: boolean; // fills the remaining space of a flex parent
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void; // when rendered as a form
  ariaLabel?: string;
}
