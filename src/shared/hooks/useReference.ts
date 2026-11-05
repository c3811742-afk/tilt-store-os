import { createContext, useContext } from 'react';
import type { ReferenceData } from '@/shared/api';

export const ReferenceContext = createContext<ReferenceData | null>(null);

// Branches, brands, categories, people and settings, loaded once and kept up to date by <ReferenceProvider>.
export const useReference = () => {
  const context = useContext(ReferenceContext);
  if (!context) throw new Error('useReference must be used inside <ReferenceProvider>');
  return context;
};
