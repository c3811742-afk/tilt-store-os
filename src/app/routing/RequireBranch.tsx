import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/components';
import { useBranchChoice, useLocale } from '@/shared/hooks';

// Pages that work in one branch (manager, storekeeper, cashier). People not linked to a branch yet see why.
export const RequireBranch = ({ children }: { children: ReactNode }) => {
  const { text } = useLocale();
  const { branch } = useBranchChoice();
  if (!branch) return <EmptyState title={text.shell.noBranch.title} message={text.shell.noBranch.message} />;
  return children;
};
