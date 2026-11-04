import type { ReactNode } from 'react';

export interface StateMessageProps {
  title?: string;
  message?: string;
  icon?: ReactNode; // shown above the text (e.g. a Spinner)
  actions?: ReactNode; // buttons shown below the text
  role?: 'status' | 'alert'; // 'status' for loading/empty, 'alert' for errors
  minHeight?: string;
  maxWidth?: string; // max width of the text block
}
