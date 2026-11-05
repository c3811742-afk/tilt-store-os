import type { ReactNode } from 'react';

export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
}
