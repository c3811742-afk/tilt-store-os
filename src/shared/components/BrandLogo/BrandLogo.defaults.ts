import { brand } from '@/shared/constants';
import { vars } from '@/shared/theme';
import type { BrandLogoProps, BrandLogoSize } from './BrandLogo.types';

export const brandLogoHeights: Record<BrandLogoSize, string> = vars.sizes.logo.height;

// Green on light, mint on dark (the same color as the main action).
export const brandLogoDefaults: Required<BrandLogoProps> = {
  size: 'md',
  color: vars.colors.primary,
  label: brand.name,
};
