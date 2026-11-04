import { vars } from '@/shared/theme';
import type { TextProps } from './Text.types';

export const textStyleVars = vars.typography.textStyles;

export const textDefaults: Required<Pick<TextProps, 'as' | 'variant' | 'color' | 'align' | 'autoDirection'>> = {
  as: 'p',
  variant: 'body',
  color: vars.colors.text,
  align: 'start',
  autoDirection: false,
};
