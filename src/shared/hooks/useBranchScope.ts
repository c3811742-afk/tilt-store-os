import { createContext, useContext } from 'react';
import type { Branch, Id } from '@/shared/types';

export interface BranchScopeContextValue {
  branch: Branch | null; // the branch the person is working in on this device; null when they have none
  branches: Branch[]; // every branch they work in
  setBranchId: (branchId: Id) => void;
}

export const BranchScopeContext = createContext<BranchScopeContextValue | null>(null);

// The branch choice itself, also for people without a branch (the branch picker in the top bar).
export const useBranchChoice = () => {
  const context = useContext(BranchScopeContext);
  if (!context) throw new Error('useBranchChoice must be used inside <BranchScopeProvider>');
  return context;
};

// The branch a branch manager, storekeeper or cashier is working in. Staff only ever see their own branches.
// Pages that use it are behind <RequireBranch>, so there is always a branch.
export const useBranchScope = () => {
  const { branch, branches, setBranchId } = useBranchChoice();
  if (!branch) throw new Error('useBranchScope must be used inside <RequireBranch>');
  return { branch, branchId: branch.id, branches, branchIds: branches.map((current) => current.id), setBranchId };
};
