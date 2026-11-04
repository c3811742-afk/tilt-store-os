import type { Locale } from './locales';

// Direction A uses Inter for everything. IBM Plex Sans Arabic is its Arabic partner.
// Load `fontsUrl` once, globally (vite.config.ts does it).
export const fontsUrl =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';

// Each stack falls back to the other script's font, so mixed English/Arabic text renders correctly.
const fontStack = {
  inter: "'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif",
  plexArabic: "'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
} as const;

// Every rem in the theme scales from this. It never drops below the browser default (100%),
// and grows slightly on large screens so the whole layout scales with it.
export const rootFontSize = 'clamp(100%, 0.875rem + 0.25vw, 112.5%)';

// Admin software scale: small and steady. Only the display size is fluid.
export const fontSize = {
  xs: '0.75rem', // 12
  sm: '0.875rem', // 14
  md: '1rem', // 16
  lg: '1.125rem', // 18
  xl: '1.375rem', // 22
  xxl: '1.75rem', // 28
  display: 'clamp(1.75rem, 1.25rem + 2vw, 2.5rem)', // 28–40
} as const;

// Numbers in tables and stat cards line up when every digit has the same width.
export const numeric = { tabular: 'tabular-nums', normal: 'normal' } as const;

// Arabic needs more line height, no letter spacing and no uppercase.
const localeTypography = {
  en: {
    fontFamily: { display: fontStack.inter, body: fontStack.inter },
    lineHeight: { tight: 1.2, snug: 1.35, body: 1.5 },
    letterSpacing: { normal: '0', tight: '-0.01em', wide: '0.06em' },
    caps: 'uppercase',
  },
  ar: {
    fontFamily: { display: fontStack.plexArabic, body: fontStack.plexArabic },
    lineHeight: { tight: 1.4, snug: 1.55, body: 1.8 },
    letterSpacing: { normal: '0', tight: '0', wide: '0' },
    caps: 'none',
  },
} as const;

const buildTypography = (locale: Locale) => {
  const { fontFamily, lineHeight, letterSpacing, caps } = localeTypography[locale];

  const textStyle = (
    family: keyof typeof fontFamily,
    size: keyof typeof fontSize,
    weight: number,
    height: keyof typeof lineHeight,
    transform: string = 'none',
    spacing: keyof typeof letterSpacing = 'normal',
  ) => ({
    fontFamily: fontFamily[family],
    fontSize: fontSize[size],
    fontWeight: weight,
    lineHeight: lineHeight[height],
    textTransform: transform,
    letterSpacing: letterSpacing[spacing],
  });

  // Named text styles. Components pick a style, then override single props if needed.
  // Sentence case everywhere; only `label` (small section labels like "LOW STOCK") is uppercase.
  const textStyles = {
    display: textStyle('display', 'display', fontWeight.semiBold, 'tight', 'none', 'tight'),
    h1: textStyle('display', 'xxl', fontWeight.semiBold, 'tight', 'none', 'tight'),
    h2: textStyle('display', 'xl', fontWeight.semiBold, 'snug'),
    h3: textStyle('display', 'lg', fontWeight.semiBold, 'snug'),
    h4: textStyle('body', 'md', fontWeight.semiBold, 'snug'),
    body: textStyle('body', 'md', fontWeight.regular, 'body'),
    bodySm: textStyle('body', 'sm', fontWeight.regular, 'body'),
    caption: textStyle('body', 'xs', fontWeight.regular, 'snug'),
    label: textStyle('body', 'xs', fontWeight.semiBold, 'snug', caps, 'wide'),
    stat: textStyle('display', 'xxl', fontWeight.semiBold, 'tight', 'none', 'tight'), // big numbers on stat cards
    button: textStyle('body', 'sm', fontWeight.semiBold, 'tight'),
  };

  return { rootFontSize, fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, numeric, textStyles };
};

export const typographyByLocale = {
  en: buildTypography('en'),
  ar: buildTypography('ar'),
} as const;

export type Typography = ReturnType<typeof buildTypography>;
