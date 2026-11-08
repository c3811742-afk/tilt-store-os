import { vars } from '@/shared/theme';
import type { BarcodeProps } from './Barcode.types';

export const barcodeDefaults: Required<Pick<BarcodeProps, 'value' | 'format' | 'height' | 'maxWidth' | 'showValue'>> = {
  value: '',
  format: 'code128',
  height: vars.sizes.barcode.height,
  maxWidth: vars.sizes.barcode.maxWidth,
  showValue: true,
};
