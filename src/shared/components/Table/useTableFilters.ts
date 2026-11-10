import { useState } from 'react';
import type { TableFilterValue } from './Table.types';
import type { TableFilterDef } from './tableFilters';

export interface TableFilterController {
  values: Record<string, TableFilterValue>; // each column's filter in use
  setValue: (key: string, value: TableFilterValue) => void;
  clear: () => void;
  defs: TableFilterDef[]; // the filters the table offers (it reports them from its columns and rows)
  setDefs: (defs: TableFilterDef[]) => void;
}

// A table's column filters, held by the page so they sit in the page's own Filters panel (one Filters button per
// page): give it to the Table (`filters`) and to the FilterToolbar (`table`).
export const useTableFilters = (): TableFilterController => {
  const [values, setValues] = useState<Record<string, TableFilterValue>>({});
  const [defs, setDefs] = useState<TableFilterDef[]>([]);
  return {
    values,
    setValue: (key, value) => setValues((current) => ({ ...current, [key]: value })),
    clear: () => setValues({}),
    defs,
    setDefs,
  };
};
