import { vars } from '@/shared/theme';
import type { BarListProps } from './BarList.types';

export const barListDefaults: Required<Pick<BarListProps, 'items' | 'color'>> = {
  items: [],
  color: vars.colors.primary,
};
