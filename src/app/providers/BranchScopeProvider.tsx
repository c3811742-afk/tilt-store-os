import { useMemo, useState, type ReactNode } from 'react';
import { storageKeys } from '@/shared/constants';
import { BranchScopeContext, useReference, useSession } from '@/shared/hooks';
import type { BranchKind } from '@/shared/types';
import { storage } from '@/shared/utils';

// The kinds of branch each role works in. Storekeepers also work in the warehouse; the online store is run by the
// online orders staff, so it is not one of a manager's or cashier's branches.
const storeKinds: readonly BranchKind[] = ['store'];
const storekeeperKinds: readonly BranchKind[] = ['store', 'warehouse'];

// The branch the signed-in person is working in on this device: one of their own branches, remembered on the device.
// Pages only ever ask for the branch chosen here.
export const BranchScopeProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const { branches: allBranches } = useReference();
  const [saved, setSaved] = useState(() => storage.get(storageKeys.branch));

  const value = useMemo(() => {
    const kinds = session?.roles.includes('storekeeper') ? storekeeperKinds : storeKinds;
    const branches = allBranches.filter((branch) => !branch.archived && kinds.includes(branch.kind) && session?.user.branchIds.includes(branch.id));
    return {
      branch: branches.find((current) => current.id === saved) ?? branches[0] ?? null,
      branches,
      setBranchId: (branchId: string) => {
        storage.set(storageKeys.branch, branchId);
        setSaved(branchId);
      },
    };
  }, [allBranches, session, saved]);

  return <BranchScopeContext value={value}>{children}</BranchScopeContext>;
};
