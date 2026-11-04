import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyTheme,
  defaultLocale,
  isAppearance,
  isLocale,
  nextAppearance,
  nextLocale,
  systemAppearance,
  themes,
  type Appearance,
  type Locale,
} from '@/shared/theme';
import { storageKeys, texts } from '@/shared/constants';
import { AppearanceContext, LocaleContext } from '@/shared/hooks';
import { storage } from '@/shared/utils';

const savedLocale = (): Locale => {
  const saved = storage.get(storageKeys.locale);
  return isLocale(saved) ? saved : defaultLocale;
};

// The user's last choice, or their system setting the first time.
const savedAppearance = (): Appearance => {
  const saved = storage.get(storageKeys.appearance);
  return isAppearance(saved) ? saved : systemAppearance();
};

// Holds the active language and appearance, and applies their theme (CSS variables, lang, dir) before each paint.
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(savedLocale);
  const [appearance, setAppearance] = useState<Appearance>(savedAppearance);
  const theme = themes[locale][appearance];
  const text = texts[locale];

  useLayoutEffect(() => {
    applyTheme(theme);
    document.title = text.meta.title;
    storage.set(storageKeys.locale, locale);
    storage.set(storageKeys.appearance, appearance);
  }, [locale, appearance, theme, text]);

  const switchLocale = useCallback(() => setLocale(nextLocale), []);
  const switchAppearance = useCallback(() => setAppearance(nextAppearance), []);

  const localeValue = useMemo(
    () => ({ locale, theme, text, setLocale, switchLocale }),
    [locale, theme, text, switchLocale],
  );
  const appearanceValue = useMemo(
    () => ({ appearance, setAppearance, switchAppearance }),
    [appearance, switchAppearance],
  );

  return (
    <LocaleContext value={localeValue}>
      <AppearanceContext value={appearanceValue}>{children}</AppearanceContext>
    </LocaleContext>
  );
};
