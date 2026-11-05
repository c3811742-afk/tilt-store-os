import type { ReactNode } from 'react';

export interface CheckboxGroupProps<T extends string = string> {
  label?: ReactNode;
  options?: { value: T; label: string }[];
  value?: T[]; // the checked values
  onChange?: (value: T[]) => void;
  hint?: ReactNode;
  error?: string;
  minColumnWidth?: string;
}
