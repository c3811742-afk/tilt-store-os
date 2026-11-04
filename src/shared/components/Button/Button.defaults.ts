import { vars } from '@/shared/theme';
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

interface ButtonVariantStyle {
  background: string;
  hoverBackground: string;
  color: string;
  borderColor: string;
}

export const buttonVariants: Record<ButtonVariant, ButtonVariantStyle> = {
  // Green on light, mint on dark: the main action on a screen.
  primary: {
    background: vars.colors.primary,
    hoverBackground: vars.colors.primaryHover,
    color: vars.colors.onPrimary,
    borderColor: vars.colors.primary,
  },
  // Outlined: secondary actions next to a primary one (Cancel, Export).
  secondary: {
    background: vars.colors.surface,
    hoverBackground: vars.colors.surfaceMuted,
    color: vars.colors.text,
    borderColor: vars.colors.border,
  },
  // Filled grey: quiet actions inside cards and toolbars.
  muted: {
    background: vars.colors.surfaceMuted,
    hoverBackground: vars.colors.border,
    color: vars.colors.text,
    borderColor: vars.colors.surfaceMuted,
  },
  danger: {
    background: vars.colors.danger,
    hoverBackground: vars.colors.danger,
    color: vars.colors.onDanger,
    borderColor: vars.colors.danger,
  },
};

export const buttonHeights: Record<ButtonSize, string> = vars.sizes.button.height;

export const buttonDefaults: Required<Pick<ButtonProps, 'variant' | 'size' | 'radius' | 'fullWidth' | 'disabled' | 'type'>> = {
  variant: 'primary',
  size: 'md',
  radius: vars.radii.md,
  fullWidth: false,
  disabled: false,
  type: 'button',
};
