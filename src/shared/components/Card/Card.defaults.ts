import { vars } from '@/shared/theme';
import type { CardProps } from './Card.types';

export const cardDefaults: Required<Pick<CardProps, 'as' | 'padding' | 'gap' | 'background' | 'borderColor' | 'radius' | 'printHidden'>> = {
  as: 'div',
  padding: vars.sizes.card.padding,
  gap: vars.spacing[4],
  background: vars.colors.surface,
  borderColor: vars.colors.border,
  radius: vars.radii.md,
  printHidden: false,
};
