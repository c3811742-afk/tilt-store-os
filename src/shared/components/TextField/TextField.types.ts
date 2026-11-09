import type { HTMLInputTypeAttribute, ReactNode } from 'react';

export interface TextFieldProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  hint?: ReactNode; // what the field is, as an (i) beside the label
  note?: ReactNode; // a rule the value must meet, shown under the field
  optional?: boolean;
  error?: string;
  invalid?: boolean; // red outline without a message under the box (the message is shown elsewhere, e.g. under a row with a button)
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
