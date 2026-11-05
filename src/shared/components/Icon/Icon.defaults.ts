import { vars } from '@/shared/theme';
import type { IconProps } from './Icon.types';

export const iconViewBox = '0 0 24 24'; // the grid every icon in the registry is drawn on
export const iconStroke = {
  width: 1.75, // in viewBox units, so it scales with the icon
  linecap: 'round', // direction A: calm, rounded line ends
  linejoin: 'round',
} as const;

export const iconDefaults: Required<Pick<IconProps, 'name' | 'size' | 'color'>> = {
  name: 'info',
  size: vars.sizes.icon.sm,
  color: 'currentColor',
};
