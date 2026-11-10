import { Fragment, useState } from 'react';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, formatDate, formatNumber, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Card } from '../Card';
import { FilterBar } from '../FilterBar';
import { Icon } from '../Icon';
import { SelectField } from '../SelectField';
import { TextField } from '../TextField';
import { isFilterSet } from '../Table/tableFilters';
import type { TableFilterDef } from '../Table/tableFilters';
import type { TableFilterController } from '../Table/useTableFilters';
import { filterChipsDefaults, filterToolbarDefaults } from './FilterToolbar.defaults';
import type { FilterButtonProps, FilterChip, FilterChipsProps, FilterPanelProps, FilterToolbarField, FilterToolbarProps } from './FilterToolbar.types';
import styles from './FilterToolbar.module.css';

// The one filter design of every page and table, as analytics and admin tools lay it out: a Filters button that opens
// a panel with every filter, and the filters in use as chips ("Branch: Park Mall ×") with Clear filters.

export const FilterButton = ({ count = 0, onToggle }: FilterButtonProps) => {
  const { text, locale } = useLocale();
  return (
    <Button variant="secondary" onClick={onToggle}>
      <Icon name="filter" />
      {count ? `${text.common.filters} (${formatNumber(count, locale)})` : text.common.filters}
    </Button>
  );
};

export const FilterPanel = ({ children, onClose }: FilterPanelProps) => {
  const { text } = useLocale();
  return (
    <Card
      title={text.common.filters}
      background={vars.colors.surfaceMuted}
      actions={
        <Button size="sm" variant="muted" onClick={onClose}>
          {text.common.close}
        </Button>
      }
    >
      <FilterBar>{children}</FilterBar>
    </Card>
  );
};

export const FilterChips = (props: FilterChipsProps) => {
  const { chips } = withDefaults(filterChipsDefaults, props);
  const { text } = useLocale();
  if (!chips.length) return null;
  return (
    <div className={styles.chips}>
      {chips.map((chip) => (
        <Button key={chip.key} size="sm" variant="secondary" onClick={chip.clear}>
          {`${chip.label}: ${chip.value}`}
          <Icon name="close" />
        </Button>
      ))}
      <Button size="sm" variant="muted" onClick={() => chips.forEach((chip) => chip.clear())}>
        {text.common.clearFilters}
      </Button>
    </div>
  );
};

// A table's column filters as fields of the panel: pick a value, type words, or a from/to range (numbers or days).
const useColumnFields = (table?: TableFilterController): FilterToolbarField[] => {
  const { text, locale } = useLocale();
  if (!table) return [];
  const chipValue = (def: TableFilterDef) => {
    const filter = table.values[def.key];
    if (filter.choice) return filter.choice;
    if (filter.text?.trim()) return filter.text.trim();
    const shown = (value?: string) => (value?.trim() && def.kind === 'date' ? formatDate(value, locale) : value?.trim());
    const min = shown(filter.min);
    const max = shown(filter.max);
    if (min && max) return fillText(text.common.betweenValues, { from: min, to: max });
    return min ? fillText(text.common.fromValue, { value: min }) : fillText(text.common.upToValue, { value: max ?? '' });
  };
  return table.defs.map((def) => {
    const value = table.values[def.key] ?? {};
    const set = (next: typeof value) => table.setValue(def.key, next);
    const type = def.kind === 'date' ? 'date' : 'number';
    const field =
      def.kind === 'choice' ? (
        <SelectField label={def.label} placeholder={text.common.all} value={value.choice ?? ''} onChange={(choice) => set({ choice })} options={def.choices.map((choice) => ({ value: choice, label: choice }))} />
      ) : def.kind === 'text' ? (
        <TextField label={def.label} placeholder={text.common.search} value={value.text ?? ''} onChange={(input) => set({ text: input })} />
      ) : (
        <>
          <TextField label={fillText(text.common.rangeFrom, { label: def.label })} type={type} value={value.min ?? ''} onChange={(min) => set({ ...value, min })} />
          <TextField label={fillText(text.common.rangeTo, { label: def.label })} type={type} value={value.max ?? ''} onChange={(max) => set({ ...value, max })} />
        </>
      );
    return { key: `column-${def.key}`, field, chip: isFilterSet(value) ? { label: def.label, value: chipValue(def), clear: () => set({}) } : undefined };
  });
};

// The row (search, period... then Filters), the panel and the chips, for a page's filters and its table's columns.
export const FilterToolbar = (props: FilterToolbarProps) => {
  const { leading, trailing, fields, table } = withDefaults(filterToolbarDefaults, props);
  const [open, setOpen] = useState(false);
  const all = [...fields, ...useColumnFields(table)];
  const chips: FilterChip[] = all.flatMap((item) => (item.chip ? [{ key: item.key, ...item.chip }] : []));
  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        {leading}
        {all.length > 0 && <FilterButton count={chips.length} onToggle={() => setOpen(!open)} />}
        {trailing}
      </div>
      {open && all.length > 0 && (
        <FilterPanel onClose={() => setOpen(false)}>
          {all.map((item) => (
            <Fragment key={item.key}>{item.field}</Fragment>
          ))}
        </FilterPanel>
      )}
      <FilterChips chips={chips} />
    </div>
  );
};
