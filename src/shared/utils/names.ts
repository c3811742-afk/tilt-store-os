import type { Localized } from '@/shared/types';
import type { Locale } from '@/shared/theme';

// The name of a country or currency in the active language, from the browser (never written by hand).
export const countryName = (code: string, locale: Locale) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

export const currencyName = (code: string, locale: Locale) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
};

// A name typed in both languages, in the active one (falls back to the other when one is empty).
export const localized = (value: Localized | undefined, locale: Locale) => (value ? value[locale] || value.en || value.ar : '');
