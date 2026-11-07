import { vars } from '@/shared/theme';
import type { SearchBoxProps } from './SearchBox.types';

export const searchBoxDefaults: Required<Pick<SearchBoxProps, 'value' | 'items' | 'loading' | 'width' | 'inputMode' | 'autoFocus' | 'listPosition'>> = {
  value: '',
  items: [],
  loading: false,
  width: vars.sizes.searchBox.maxWidth,
  inputMode: 'search',
  autoFocus: false,
  listPosition: 'overlay',
};
