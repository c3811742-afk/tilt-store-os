import { colorsByAppearance } from './colors';
import { typographyByLocale } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { borders } from './borders';
import { shadows } from './shadows';
import { breakpoints } from './breakpoints';
import { zIndex } from './zIndex';
import { motion } from './motion';
import { opacity } from './opacity';
import { sizes } from './sizes';
import { locales, defaultLocale, type Locale } from './locales';
import { appearances, defaultAppearance, type Appearance } from './appearances';

const buildTheme = (locale: Locale, appearance: Appearance) => {
  const { lang, dir } = locales[locale];
  return {
    locale,
    lang,
    dir,
    appearance,
    breakpoints,
    colors: colorsByAppearance[appearance],
    typography: typographyByLocale[locale],
    spacing,
    radii,
    borders,
    shadows,
    zIndex,
    motion,
    opacity,
    sizes,
  };
};

type ThemesByAppearance = Record<Appearance, ReturnType<typeof buildTheme>>;

const buildThemesFor = (locale: Locale) =>
  Object.fromEntries(appearances.map((appearance) => [appearance, buildTheme(locale, appearance)])) as ThemesByAppearance;

// One theme per language and appearance: themes.en.light, themes.ar.dark...
// The active one is chosen by the app's current locale and appearance.
export const themes: Record<Locale, ThemesByAppearance> = {
  en: buildThemesFor('en'),
  ar: buildThemesFor('ar'),
};

export const theme = themes[defaultLocale][defaultAppearance];

export type Theme = ReturnType<typeof buildTheme>;
