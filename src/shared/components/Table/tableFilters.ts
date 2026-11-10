import { nodeText, numberIn } from '@/shared/utils';
import type { TableColumn, TableFilterValue, TableRow } from './Table.types';

export type TableFilterKind = 'choice' | 'text' | 'range' | 'date';

export interface TableFilterDef {
  key: string;
  label: string;
  kind: TableFilterKind;
  choices: string[]; // for 'choice': every value the column shows, in order
}

// What a cell is filtered by: the value the page gave, or the words it shows.
export const cellValue = (row: TableRow, key: string) => String(row.values?.[key] ?? nodeText(row.cells[key])).trim();

// A date the page gave as the cell's value (2026-10-25 or 2026-10-25T15:01:00Z): filtered by a range of days.
const isoDate = /^\d{4}-\d{2}-\d{2}/;

// The filters a table offers: every column with a name and more than one value. A date column is filtered by a range
// of days, a number column (aligned to the end)
// is filtered by a range, a column with few values by picking one, any other by the words it contains.
export const tableFilterDefs = (columns: readonly TableColumn[], rows: readonly TableRow[], choicesMax: number): TableFilterDef[] =>
  columns.flatMap((column): TableFilterDef[] => {
    const label = nodeText(column.label).trim();
    if (column.filterable === false || !label) return [];
    const values = rows.map((row) => cellValue(row, column.key)).filter(Boolean);
    const distinct = [...new Set(values)];
    if (distinct.length < 2) return [];
    if (values.every((value) => isoDate.test(value))) return [{ key: column.key, label, kind: 'date' as const, choices: [] }];
    const numbers = values.filter((value) => numberIn(value) !== null).length;
    if (column.align === 'end' && numbers === values.length) return [{ key: column.key, label, kind: 'range' as const, choices: [] }];
    if (distinct.length <= choicesMax) return [{ key: column.key, label, kind: 'choice' as const, choices: distinct.sort((a, b) => a.localeCompare(b)) }];
    return [{ key: column.key, label, kind: 'text' as const, choices: [] }];
  });

export const isFilterSet = (value: TableFilterValue | undefined) => Boolean(value && (value.choice || value.text?.trim() || value.min?.trim() || value.max?.trim()));

// Whether a row passes every filter in use.
export const passesFilters = (row: TableRow, defs: readonly TableFilterDef[], filters: Record<string, TableFilterValue>) =>
  defs.every((def) => {
    const filter = filters[def.key];
    if (!isFilterSet(filter)) return true;
    const value = cellValue(row, def.key);
    if (def.kind === 'choice') return value === filter.choice;
    if (def.kind === 'text') return value.toLowerCase().includes((filter.text ?? '').trim().toLowerCase());
    if (def.kind === 'date') {
      const day = value.slice(0, 10);
      return (!filter.min || day >= filter.min) && (!filter.max || day <= filter.max);
    }
    const number = numberIn(value);
    if (number === null) return false;
    const min = filter.min?.trim() ? Number(filter.min) : null;
    const max = filter.max?.trim() ? Number(filter.max) : null;
    return (min === null || number >= min) && (max === null || number <= max);
  });
