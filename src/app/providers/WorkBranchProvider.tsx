import { useMemo, useState, type ReactNode } from 'react';
import { storageKeys } from '@/shared/constants';
import { useReference, useSession, WorkBranchContext } from '@/shared/hooks';
import { storage } from '@/shared/utils';

// The branch a staff member is working in on this device: one of their branches, remembered on the device.
export const WorkBranchProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const { branches: allBranches } = useReference();
  const [saved, setSaved] = useState(() => storage.get(storageKeys.workBranch));
  const assigned = session?.user.branchIds;

  const value = useMemo(() => {
    const branches = allBranches.filter((branch) => !branch.archived && branch.kind !== 'warehouse' && assigned?.includes(branch.id));
    const branch = branches.find((current) => current.id === saved) ?? branches[0] ?? null;
    return {
      branch,
      branches,
      setBranchId: (branchId: string) => {
        storage.set(storageKeys.workBranch, branchId);
        setSaved(branchId);
      },
    };
  }, [allBranches, assigned, saved]);

  return <WorkBranchContext value={value}>{children}</WorkBranchContext>;
};
