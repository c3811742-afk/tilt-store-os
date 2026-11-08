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
  suffix?: string; // shown after the value (e.g. the percent sign: 15 %)
  aside?: string; // quiet grey text inside the box, at its end (e.g. "of 4", the most you can enter)
  width?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search';
  maxLength?: number;
}
