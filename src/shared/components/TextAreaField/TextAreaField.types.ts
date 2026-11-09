import type { ReactNode } from 'react';

export interface TextAreaFieldProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode; // what the field is, as an (i) beside the label
  note?: ReactNode; // a rule the value must meet, shown under the field
  optional?: boolean;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  width?: string;
  rows?: number;
}
