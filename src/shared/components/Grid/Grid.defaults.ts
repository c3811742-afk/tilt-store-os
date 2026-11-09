import { vars } from '@/shared/theme';
import type { GridProps } from './Grid.types';

export const gridDefaults: Required<Pick<GridProps, 'minColumnWidth' | 'gap' | 'as' | 'alignItems'>> = {
  minColumnWidth: vars.sizes.card.minWidth,
  gap: vars.spacing[4],
  as: 'div',
  alignItems: 'stretch',
};
