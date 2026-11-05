import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { routes } from '@/shared/constants';
import { useSession } from '@/shared/hooks';

// Owner pages: signed-out visitors go to the sign-in page, other roles are sent there too with a message.
export const RequireOwner = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  if (!session?.isOwner) return <Navigate to={routes.signIn} replace />;
  return children;
};
