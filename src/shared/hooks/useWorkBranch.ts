import { createContext, useContext } from 'react';
import type { Branch } from '@/shared/types';

export interface WorkBranchContextValue {
  branch: Branch | null; // the branch the person is working in on this device
  branches: Branch[]; // the branches they are assigned to
  setBranchId: (branchId: string) => void;
}

export const WorkBranchContext = createContext<WorkBranchContextValue | null>(null);

// The branch the signed-in person is working in. Staff only see their own branches' data.
export const useWorkBranch = () => {
  const context = useContext(WorkBranchContext);
  if (!context) throw new Error('useWorkBranch must be used inside <WorkBranchProvider>');
  return context;
};
