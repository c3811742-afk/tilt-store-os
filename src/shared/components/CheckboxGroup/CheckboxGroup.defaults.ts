import { vars } from '@/shared/theme';
import type { CheckboxGroupProps } from './CheckboxGroup.types';

export const checkboxGroupDefaults: Required<Pick<CheckboxGroupProps, 'options' | 'value' | 'minColumnWidth'>> = {
  options: [],
  value: [],
  minColumnWidth: vars.sizes.field.narrow,
};
