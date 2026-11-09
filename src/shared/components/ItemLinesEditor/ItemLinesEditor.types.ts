import type { ReactNode } from 'react';
import type { VariantHit } from '@/shared/api';

export interface ItemLine extends VariantHit {
  qty: number;
}

export interface ItemLinesEditorProps {
  lines?: ItemLine[];
  onChange?: (lines: ItemLine[]) => void;
  quantityLabel?: ReactNode; // the quantity column's heading (e.g. "Counted")
  error?: string; // shown under the list (e.g. "Add at least one item.")
  disabled?: boolean;
  autoFocus?: boolean; // focus the scan field, ready for the scanner
  stockBranchId?: string; // the search shows this branch's stock, low items first (e.g. requesting stock)
}
