import type { ReactNode } from 'react';
import { useSession } from '@/shared/hooks';
import { AccessPage } from '@/features/common/pages/AccessPage';

// Owner pages: owners, and the IT admin (who can open every screen). Anyone else sees "You don't have access".
export const RequireOwner = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  if (!session?.isOwner && !session?.roles.includes('it')) return <AccessPage />;
  return children;
};
