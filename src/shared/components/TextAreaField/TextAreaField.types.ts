import type { ReactNode } from 'react';

export interface TextAreaFieldProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  width?: string;
  rows?: number;
}
