import { vars } from '@/shared/theme';
import type { PeriodFilterProps } from './PeriodFilter.types';

export const periodFilterDefaults: Required<Pick<PeriodFilterProps, 'presets' | 'width'>> = {
  presets: ['today', 'week', 'month', 'last30', 'last90', 'custom'],
  width: vars.sizes.field.narrow,
};
