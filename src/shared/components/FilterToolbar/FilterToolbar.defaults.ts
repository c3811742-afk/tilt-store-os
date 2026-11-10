import type { FilterChipsProps, FilterToolbarProps } from './FilterToolbar.types';

export const filterToolbarDefaults: Required<Pick<FilterToolbarProps, 'fields'>> = {
  fields: [],
};

export const filterChipsDefaults: Required<Pick<FilterChipsProps, 'chips'>> = {
  chips: [],
};
