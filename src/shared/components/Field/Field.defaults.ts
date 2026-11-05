import { vars } from '@/shared/theme';
import type { FieldProps } from './Field.types';

export const fieldDefaults: Required<Pick<FieldProps, 'required' | 'width'>> = {
  required: false,
  width: vars.sizes.field.maxWidth,
};
