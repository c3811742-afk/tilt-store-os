import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { routes } from '@/shared/constants';
import { useSession } from '@/shared/hooks';

// Every page after sign-in: signed-out visitors go to the sign-in page.
export const RequireSignedIn = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  if (!session) return <Navigate to={routes.signIn} replace />;
  return children;
};
