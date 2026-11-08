import type { ReactNode } from 'react';
import type { Permission } from '@/shared/constants';
import { useSession } from '@/shared/hooks';
import type { BuiltInRole } from '@/shared/types';
import { AccessPage } from '@/features/common/pages/AccessPage';

interface RequirePermissionProps {
  permission?: Permission; // the person's roles must allow this
  role?: BuiltInRole; // or the person must have this kind of role
  children: ReactNode;
}

// A page only some roles can open. Anyone else sees "You don't have access to this page".
export const RequirePermission = ({ permission, role, children }: RequirePermissionProps) => {
  const { session } = useSession();
  const allowed = (permission && session?.permissions.includes(permission)) || (role && session?.roles.includes(role));
  if (!allowed) return <AccessPage />;
  return children;
};
