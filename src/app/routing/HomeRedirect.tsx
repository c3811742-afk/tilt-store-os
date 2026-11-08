import { Navigate } from 'react-router';
import { routes } from '@/shared/constants';
import { useSession } from '@/shared/hooks';
import { homeFor } from '../navigation';

// The address "/": each person's start page, or the sign-in page.
export const HomeRedirect = () => {
  const { session } = useSession();
  return <Navigate to={session ? homeFor(session) : routes.signIn} replace />;
};
