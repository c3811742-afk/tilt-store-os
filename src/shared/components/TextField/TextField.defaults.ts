import { vars } from '@/shared/theme';
import type { TextFieldProps } from './TextField.types';

export const textFieldDefaults: Required<Pick<TextFieldProps, 'value' | 'type' | 'required' | 'disabled' | 'width'>> = {
  value: '',
  type: 'text',
  required: false,
  disabled: false,
  width: vars.sizes.field.maxWidth,
};
