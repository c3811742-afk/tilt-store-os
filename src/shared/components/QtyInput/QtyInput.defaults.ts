import { vars } from '@/shared/theme';
import type { QtyInputProps } from './QtyInput.types';

export const qtyInputDefaults: Required<Pick<QtyInputProps, 'value' | 'min' | 'disabled' | 'width'>> = {
  value: '',
  min: 0,
  disabled: false,
  width: vars.sizes.field.qty,
};
