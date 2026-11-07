import { vars } from '@/shared/theme';
import type { ScanFieldProps } from './ScanField.types';

export const scanFieldDefaults: Required<Pick<ScanFieldProps, 'disabled' | 'autoFocus' | 'width' | 'clearOnScan'>> = {
  disabled: false,
  autoFocus: false,
  width: vars.sizes.field.maxWidth,
  clearOnScan: true,
};
