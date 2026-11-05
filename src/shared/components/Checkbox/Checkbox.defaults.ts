import type { CheckboxProps } from './Checkbox.types';

export const checkboxDefaults: Required<Pick<CheckboxProps, 'checked' | 'disabled'>> = {
  checked: false,
  disabled: false,
};
