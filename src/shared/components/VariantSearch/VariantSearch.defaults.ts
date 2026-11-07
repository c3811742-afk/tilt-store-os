import { vars } from '@/shared/theme';
import type { VariantSearchProps } from './VariantSearch.types';

export const variantSearchDefaults: Required<Pick<VariantSearchProps, 'disabled' | 'autoFocus' | 'width'>> = {
  disabled: false,
  autoFocus: false,
  width: vars.sizes.field.maxWidth,
};
