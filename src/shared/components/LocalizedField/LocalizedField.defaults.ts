import type { LocalizedFieldProps } from './LocalizedField.types';

export const localizedFieldDefaults: Required<Pick<LocalizedFieldProps, 'value' | 'required'>> = {
  value: { en: '', ar: '' },
  required: false,
};
