import type { BranchKind } from '@/shared/types';

export interface ReferenceSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string; // the empty choice; without it a value is required
  error?: string;
  width?: string;
}

export interface BranchSelectProps extends ReferenceSelectProps {
  kinds?: BranchKind[]; // which kinds of branch to offer
  includeArchived?: boolean;
}
