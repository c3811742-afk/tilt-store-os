import { useMemo, useState, type ReactNode } from 'react';
import { Container, EmptyState } from '@/shared/components';
import { storageKeys } from '@/shared/constants';
import { BranchScopeContext, useLocale, useReference, useSession } from '@/shared/hooks';
import type { BranchKind, Id } from '@/shared/types';
import { storage } from '@/shared/utils';

// Keeps branch staff inside their own branches: the pages only ever ask for the branch chosen here.
// `kinds` limits the choice (a manager works in stores, a storekeeper also in the warehouse).
export const BranchScopeProvider = ({ kinds, children }: { kinds: readonly BranchKind[]; children: ReactNode }) => {
  const { text } = useLocale();
  const { session } = useSession();
  const reference = useReference();
  const branchIds = useMemo(
    () => reference.branches.filter((branch) => !branch.archived && kinds.includes(branch.kind) && session?.user.branchIds.includes(branch.id)).map((branch) => branch.id),
    [reference.branches, kinds, session],
  );
  const [chosen, setChosen] = useState<Id | null>(() => storage.get(storageKeys.branch));
  const branchId = chosen && branchIds.includes(chosen) ? chosen : branchIds[0];

  const value = useMemo(
    () => ({
      branchId,
      branchIds,
      setBranchId: (next: Id) => {
        setChosen(next);
        storage.set(storageKeys.branch, next);
      },
    }),
    [branchId, branchIds],
  );

  if (!branchId)
    return (
      <Container as="main">
        <EmptyState title={text.shell.noBranch.title} message={text.shell.noBranch.message} />
      </Container>
    );
  return <BranchScopeContext value={value}>{children}</BranchScopeContext>;
};
