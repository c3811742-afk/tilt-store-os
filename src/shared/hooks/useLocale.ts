import { createContext, useContext } from 'react';
import type { Locale, Theme } from '@/shared/theme';
import type { Text } from '@/shared/constants';

export interface LocaleContextValue {
  locale: Locale;
  theme: Theme;
  text: Text;
  setLocale: (locale: Locale) => void;
  switchLocale: () => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

// The active language, its theme and its UI text.
export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside <ThemeProvider>');
  return context;
};
