import { vars } from '@/shared/theme';
import type { TextAreaFieldProps } from './TextAreaField.types';

export const textAreaFieldDefaults: Required<Pick<TextAreaFieldProps, 'value' | 'required' | 'disabled' | 'width' | 'rows'>> = {
  value: '',
  required: false,
  disabled: false,
  width: vars.sizes.field.maxWidth,
  rows: 3,
};
