import { vars } from '@/shared/theme';
import type { QrCodeProps } from './QrCode.types';

export const qrCodeDefaults: Required<Pick<QrCodeProps, 'value' | 'size'>> = {
  value: '',
  size: vars.sizes.qrCode,
};
