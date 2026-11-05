import { vars } from '@/shared/theme';
import type { IconButtonProps } from './IconButton.types';

export const iconButtonDefaults: Required<Pick<IconButtonProps, 'icon' | 'disabled' | 'size' | 'color'>> = {
  icon: 'more',
  disabled: false,
  size: vars.sizes.tapTarget,
  color: vars.colors.textSecondary,
};
