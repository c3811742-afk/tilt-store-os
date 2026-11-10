import type { ReactNode } from 'react';
import type { FilterToolbarField } from './FilterToolbar.types';

// A page filter for the FilterToolbar: the field, and its chip while it has a value ("Status: Active").
export const filterField = (key: string, field: ReactNode, chip: { label: string; value?: string | false | null; clear: () => void }): FilterToolbarField => ({
  key,
  field,
  chip: chip.value ? { label: chip.label, value: chip.value, clear: chip.clear } : undefined,
});
