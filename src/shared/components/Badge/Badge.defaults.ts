import { vars } from '@/shared/theme';
import type { BadgeProps, BadgeVariant } from './Badge.types';

// Soft badges: an outline in the text color, so they never compete with the green buttons.
export const badgeVariants: Record<BadgeVariant, { color: string; background: string }> = {
  neutral: { color: vars.colors.textSecondary, background: vars.colors.surfaceMuted },
  info: { color: vars.colors.text, background: vars.colors.surfaceMuted },
  brand: { color: vars.colors.onBrandSoft, background: vars.colors.brandSoft },
  success: { color: vars.colors.success, background: vars.colors.surface },
  warning: { color: vars.colors.warning, background: vars.colors.surface },
  danger: { color: vars.colors.danger, background: vars.colors.surface },
};

export const badgeDefaults: Required<Pick<BadgeProps, 'variant' | 'radius'>> = {
  variant: 'neutral',
  radius: vars.radii.sm,
};
