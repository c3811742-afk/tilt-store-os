import type { ReactNode } from 'react';
import type { TableFilterController } from '../Table/useTableFilters';

// A filter in use, shown as a chip ("Branch: Park Mall ×") that clears it.
export interface FilterChip {
  key: string;
  label: string;
  value: string;
  clear: () => void;
}

// One filter of a page (a select, a checkbox...), and its chip while it is in use.
export interface FilterToolbarField {
  key: string;
  field: ReactNode;
  chip?: Omit<FilterChip, 'key'>; // set only while the filter is in use
}

export interface FilterToolbarProps {
  leading?: ReactNode; // in the row before the Filters button (search, period, view)
  trailing?: ReactNode; // in the row after it (e.g. Compare)
  fields?: FilterToolbarField[]; // the page's own filters, in the Filters panel
  table?: TableFilterController; // a table's column filters, in the same panel
}

export interface FilterButtonProps {
  count?: number; // filters in use, shown as "Filters (2)"
  onToggle?: () => void;
}

export interface FilterPanelProps {
  children?: ReactNode; // the filter fields
  onClose?: () => void;
}

export interface FilterChipsProps {
  chips?: FilterChip[];
}
