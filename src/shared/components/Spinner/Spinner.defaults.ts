import { vars } from '@/shared/theme';
import type { SpinnerProps } from './Spinner.types';

export const spinnerDefaults: Required<SpinnerProps> = {
  size: vars.sizes.spinner.size,
  color: vars.colors.primary,
  trackColor: vars.colors.border,
};
