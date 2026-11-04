import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title?: string; // defaults to the generic empty text of the active language
  message?: string; // say what to do next, e.g. "Try a different keyword."
  action?: ReactNode; // e.g. a "Clear filters" button
  minHeight?: string;
}
