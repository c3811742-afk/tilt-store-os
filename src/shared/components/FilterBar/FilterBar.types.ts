import type { ReactNode } from 'react';

export interface FilterBarProps {
  children?: ReactNode; // the filter fields
  actions?: ReactNode; // e.g. Export, at the end
  fieldWidth?: string; // each field's width
}
