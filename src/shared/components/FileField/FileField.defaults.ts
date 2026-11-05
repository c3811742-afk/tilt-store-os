import { vars } from '@/shared/theme';
import type { FileFieldProps } from './FileField.types';

export const fileFieldDefaults: Required<Pick<FileFieldProps, 'accept' | 'value' | 'width'>> = {
  accept: '*/*',
  value: null,
  width: vars.sizes.field.maxWidth,
};
