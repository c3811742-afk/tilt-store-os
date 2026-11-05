import { vars } from '@/shared/theme';
import type { SelectFieldProps } from './SelectField.types';

export const selectFieldDefaults: Required<Pick<SelectFieldProps, 'options' | 'required' | 'disabled' | 'width'>> = {
  options: [],
  required: false,
  disabled: false,
  width: vars.sizes.field.maxWidth,
};
