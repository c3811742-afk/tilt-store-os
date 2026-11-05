import type { ReactNode } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string = string> {
  label?: ReactNode;
  value?: T;
  onChange?: (value: T) => void;
  options?: SelectOption<T>[];
  placeholder?: string; // an empty first option (value '')
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  width?: string;
}
