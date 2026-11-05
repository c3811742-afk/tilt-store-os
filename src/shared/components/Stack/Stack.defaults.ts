import { vars } from '@/shared/theme';
import type { StackProps } from './Stack.types';

export const stackDefaults: Required<Pick<StackProps, 'as' | 'direction' | 'gap' | 'align' | 'justify' | 'wrap' | 'grow'>> = {
  as: 'div',
  direction: 'column',
  gap: vars.spacing[4],
  align: 'stretch',
  justify: 'flex-start',
  wrap: false,
  grow: false,
};
