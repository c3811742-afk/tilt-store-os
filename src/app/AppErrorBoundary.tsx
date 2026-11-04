import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { ErrorBoundary } from '@/shared/components';

// App-wide boundary. Navigating to another page clears the error screen.
export const AppErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
};
