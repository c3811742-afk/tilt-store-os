import { accountDefaults } from '@/shared/constants';
import type { PinPadProps } from './PinPad.types';

export const pinPadDefaults: Required<Pick<PinPadProps, 'value' | 'length' | 'disabled'>> = {
  value: '',
  length: accountDefaults.pinLength,
  disabled: false,
};
