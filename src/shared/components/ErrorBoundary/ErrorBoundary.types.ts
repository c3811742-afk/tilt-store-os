import type { ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: (reset: () => void) => ReactNode; // replace the default error screen
  resetKey?: unknown; // the boundary clears its error when this changes (e.g. the current path)
}
