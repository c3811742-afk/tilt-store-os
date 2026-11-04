import { createContext, useContext } from 'react';
import type { Appearance } from '@/shared/theme';

export interface AppearanceContextValue {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  switchAppearance: () => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

// The active appearance (light or dark) and how to change it.
export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside <ThemeProvider>');
  return context;
};
