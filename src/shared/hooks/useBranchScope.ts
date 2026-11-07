import { createContext, useContext } from 'react';
import type { Id } from '@/shared/types';

export interface BranchScopeContextValue {
  branchId: Id; // the branch the pages show
  branchIds: Id[]; // every branch the signed-in person works in
  setBranchId: (branchId: Id) => void;
}

export const BranchScopeContext = createContext<BranchScopeContextValue | null>(null);

// The branch a branch manager or storekeeper is working in. Staff only ever see their own branches.
export const useBranchScope = () => {
  const context = useContext(BranchScopeContext);
  if (!context) throw new Error('useBranchScope must be used inside <BranchScopeProvider>');
  return context;
};
