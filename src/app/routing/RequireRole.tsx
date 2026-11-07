import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { routes } from '@/shared/constants';
import { useSession } from '@/shared/hooks';
import type { BuiltInRole } from '@/shared/types';

// A role's pages: signed-out visitors and people without the role go to the sign-in page.
export const RequireRole = ({ role, children }: { role: BuiltInRole; children: ReactNode }) => {
  const { session } = useSession();
  if (!session?.roles.includes(role)) return <Navigate to={routes.signIn} replace />;
  return children;
};
