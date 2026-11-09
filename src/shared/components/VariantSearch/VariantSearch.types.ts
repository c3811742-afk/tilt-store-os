import type { ReactNode } from 'react';
import type { VariantHit } from '@/shared/api';

export interface VariantSearchProps {
  onPick?: (hit: VariantHit) => void; // a scanned barcode picks at once; a search shows the matches to choose from
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  width?: string;
  stockBranchId?: string; // show what this branch has: every match, with out of stock and low items first (e.g. requesting stock)
}
