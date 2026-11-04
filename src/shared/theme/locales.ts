export const locales = {
  en: { lang: 'en', dir: 'ltr' },
  ar: { lang: 'ar', dir: 'rtl' },
} as const;

export type Locale = keyof typeof locales;
export type Direction = (typeof locales)[Locale]['dir'];

export const defaultLocale: Locale = 'en';

const localeList = Object.keys(locales) as Locale[];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && localeList.includes(value as Locale);

// The locale after `current`, cycling through all locales (used by the language switch).
export const nextLocale = (current: Locale): Locale =>
  localeList[(localeList.indexOf(current) + 1) % localeList.length];
