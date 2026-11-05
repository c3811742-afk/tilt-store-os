import type { HTMLInputTypeAttribute, ReactNode } from 'react';

export interface TextFieldProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  prefix?: string; // shown before the value (e.g. the currency: EGP)
  width?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search';
  maxLength?: number;
}
