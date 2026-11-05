import { vars } from '@/shared/theme';
import type { FilterBarProps } from './FilterBar.types';

export const filterBarDefaults: Required<Pick<FilterBarProps, 'fieldWidth'>> = {
  fieldWidth: vars.sizes.field.narrow,
};
