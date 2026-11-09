import type { ReactNode } from 'react';

export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  hint?: ReactNode; // what the option is, as an (i) beside the label
  disabled?: boolean;
}
