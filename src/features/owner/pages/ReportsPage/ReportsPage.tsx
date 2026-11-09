import { useState, type ReactNode } from 'react';
import { comparableReports, runReport, vatExport, type ReportCell, type ReportColumn, type ReportFilter, type ReportResult } from '@/shared/api';
import { AsyncContent, Button, Card, Checkbox, CategorySelect, ColorSelect, FilterBar, Icon, InfoTip, Notice, PageHeader, SegmentedControl, SelectField, SizeSelect, Stack, Table, Tabs, Text, TextField, type TableSort } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import type { SalesChannel } from '@/shared/types';
import { vars } from '@/shared/theme';
import { changePercent, fillText, type ExportCell, type ExportTable } from '@/shared/utils';
import { BranchSelect, BrandSelect, ExportButtons, PeriodFilter } from '../../components';
import { analysisViews, defaultAnalysisView, type AnalysisSection, type AnalysisView } from '../../constants/analysis';
import { useExport, usePeriod } from '../../hooks';

const sections: readonly AnalysisSection[] = ['sales', 'profit', 'stock', 'checks'];
const viewById = (id: string): AnalysisView => analysisViews.find((view) => view.id === id) ?? analysisViews.find((view) => view.id === defaultAnalysisView) ?? analysisViews[0];

// One step deeper after clicking a row: the view it leads to, what it narrows to, and the row's name for the trail.
interface DrillStep {
  view: string;
  filter: Partial<ReportFilter>;
  label: string;
}

// The owner's analysis, laid out as analytics tools usually are: View by and the period at the top, a Filters button
// that opens the filters (the ones in use show as chips that remove them), columns that sort when their heading is
// clicked, and rows that can be clicked to look one level deeper (with a trail to go back).
export const ReportsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const exporter = useExport();
  const { users, settings } = useReference();
  const period = usePeriod('month');
  const [viewId, setViewId] = useQueryState('view', defaultAnalysisView);
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [categoryId, setCategoryId] = useQueryState('category', '');
  const [cashierId, setCashierId] = useQueryState('staff', '');
  const [paymentMethodId, setPaymentMethodId] = useQueryState('payment', '');
  const [channel, setChannel] = useQueryState('channel', '');
  const [size, setSize] = useQueryState('size', '');
  const [color, setColor] = useQueryState('color', '');
  const [currencyMode, setCurrencyMode] = useQueryState<'reporting' | 'branch'>('currency', 'reporting');
  const [compare, setCompare] = useQueryState('compare', '');
  const [weeks, setWeeks] = useQueryState('weeks', '');
  const [trail, setTrail] = useState<DrillStep[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<TableSort | null>(null);
  const version = useLiveVersion();
  const t = text.owner.reports;

  const root = viewById(viewId);
  const view = trail.length ? viewById(trail[trail.length - 1].view) : root;
  const shows = (key: (typeof view.filters)[number]) => view.filters.includes(key);
  const base: ReportFilter = {
    range: period.range,
    branchId: branchId || undefined,
    brandId: brandId || undefined,
    categoryId: categoryId || undefined,
    cashierId: cashierId || undefined,
    paymentMethodId: paymentMethodId || undefined,
    channel: (channel || undefined) as SalesChannel | undefined,
    size: size || undefined,
    color: color || undefined,
    currencyMode,
    compare: compare === '1',
    weeks: weeks ? Number(weeks) : undefined,
  };
  const filter: ReportFilter = { ...trail.reduce<ReportFilter>((current, step) => ({ ...current, ...step.filter }), base), groupBy: view.groupBy };
  const filterKey = JSON.stringify(filter);
  const state = useAsync(() => runReport(view.report, filter), [view.report, filterKey, version]);
  const canCompare = comparableReports.includes(view.report);
  const title = t.views[view.id as keyof typeof t.views] ?? view.id;
  const periodText = `${format.date(filter.range.from)} – ${format.date(filter.range.to)}`;

  // Words stored in the data (statuses, models, channels, payment methods) shown in the active language.
  const word = (column: ReportColumn, value: ReportCell): string => {
    if (value === 'total') return text.common.total;
    if (value === 'company') return text.common.wholeCompany;
    if (typeof value !== 'string') return '';
    if (column.key === 'status') return (t.statusWords as Record<string, string>)[value] ?? value;
    if (column.key === 'model') return (text.owner.brands.terms.models as Record<string, string>)[value] ?? value;
    if (column.key === 'channel' || (column.key === 'name' && view.groupBy === 'channel')) return (t.channels as Record<string, string>)[value] ?? value;
    if (column.key === 'payment') return value.split(',').filter(Boolean).map(format.payment).join(text.common.listSeparator);
    if (column.key === 'name' && view.report === 'vat') return format.country(value);
    return value;
  };
  const show = (column: ReportColumn, value: ReportCell, currency: string): string => {
    if (value === null || value === undefined) return column.kind === 'date' ? t.never : '';
    switch (column.kind) {
      case 'money':
        return typeof value === 'number' ? format.money(value, currency) : word(column, value);
      case 'number':
        return typeof value === 'number' ? format.number(Math.round(value * 100) / 100) : word(column, value);
      case 'percent':
        return typeof value === 'number' ? format.percent(value) : word(column, value);
      case 'date':
        return value === 'total' ? text.common.total : format.date(String(value));
      case 'dateTime':
        return value === 'total' ? text.common.total : format.dateTime(String(value));
      default:
        return word(column, value);
    }
  };
  const columnLabel = (key: string) => t.columns[key as keyof typeof t.columns] ?? key;
  const exportValue = (column: ReportColumn, value: ReportCell, currency: string): ExportCell =>
    typeof value === 'number' && (column.kind === 'money' || column.kind === 'number' || column.kind === 'percent') ? Math.round(value * 100) / 100 : show(column, value, currency);
  const tablesFor = (result: ReportResult): ExportTable[] => [
    {
      title,
      headers: result.columns.map((column) => columnLabel(column.key)),
      rows: [
        ...sorted(result.rows).map((row) => result.columns.map((column) => exportValue(column, row.cells[column.key] ?? null, row.currency ?? result.currency))),
        ...(result.totals ? [result.columns.map((column) => exportValue(column, result.totals?.[column.key] ?? null, result.currency))] : []),
      ],
    },
  ];

  // Sales and VAT per country, each in its own currency: one sheet (or page) per country.
  const exportVat = async (kind: 'excel' | 'pdf') => {
    const countries = await vatExport(filter.range);
    const tables = countries.map((country) => ({
      title: `${format.country(country.countryCode)} · ${country.currency}${country.registration.vatNumber ? ` · ${country.registration.vatNumber}` : ''}`,
      headers: [text.common.date, t.columns.sale, t.columns.branch, t.columns.salesInclVat, t.columns.netSales, t.columns.vat],
      rows: country.rows.map((row) => [row.at.slice(0, 10), `${row.number}${row.isReturn ? ` (${t.returnWord})` : ''}`, format.branch(row.branchId), Math.round(row.incl * 100) / 100, Math.round(row.net * 100) / 100, Math.round(row.vat * 100) / 100]),
    }));
    if (kind === 'excel') exporter.excel(title, tables);
    else exporter.pdf(title, tables, periodText);
  };

  const cellWithChange = (column: ReportColumn, value: ReportCell, previous: ReportCell | undefined, currency: string): ReactNode => {
    const shown = show(column, value, currency);
    if (!filter.compare || !column.compare || typeof value !== 'number') return shown;
    const before = typeof previous === 'number' ? previous : 0;
    const change = changePercent(value, before);
    return (
      <Stack gap={vars.spacing[0]} align="flex-end">
        <span>{shown}</span>
        <Text as="span" variant="caption" color={change === null ? vars.colors.textMuted : change >= 0 ? vars.colors.success : vars.colors.danger}>
          {change === null ? t.new : `${change >= 0 ? '+' : ''}${format.percent(change)}`}
        </Text>
      </Stack>
    );
  };

  // Clicking a row: narrow to it and show the next view; the trail above the table goes back.
  const drillInto = (rowKey: string, rowName: string) => {
    const next = view.drill;
    const narrowed = next?.filter(rowKey);
    if (!next || !narrowed) return;
    setTrail([...trail, { view: next.view, filter: narrowed, label: rowName }]);
  };
  const pickView = (id: string) => {
    setTrail([]);
    setSort(null);
    setViewId(id);
  };

  // A tab opens on its usual view (Sales on Brand), otherwise on its first report.
  const pickSection = (section: AnalysisSection) => pickView(section === viewById(defaultAnalysisView).section ? defaultAnalysisView : (analysisViews.find((current) => current.section === section)?.id ?? defaultAnalysisView));

  // The filters in use, as chips: "Branch: Park Mall" (clicking one removes it).
  const chips = [
    shows('branch') && branchId && { key: 'branch', label: text.owner.fields.branch, value: format.branch(branchId), clear: () => setBranchId('') },
    shows('brand') && brandId && { key: 'brand', label: text.owner.fields.brand, value: format.brand(brandId), clear: () => setBrandId('') },
    shows('category') && categoryId && { key: 'category', label: text.owner.fields.category, value: format.category(categoryId), clear: () => setCategoryId('') },
    shows('staff') && cashierId && { key: 'staff', label: t.groupings.cashier, value: format.user(cashierId), clear: () => setCashierId('') },
    shows('payment') && paymentMethodId && { key: 'payment', label: t.groupings.paymentMethod, value: format.payment(paymentMethodId), clear: () => setPaymentMethodId('') },
    shows('channel') && channel && { key: 'channel', label: t.groupings.channel, value: t.channels[channel as 'store' | 'online'], clear: () => setChannel('') },
    shows('size') && size && { key: 'size', label: text.owner.fields.size, value: size, clear: () => setSize('') },
    shows('color') && color && { key: 'color', label: text.owner.fields.color, value: color, clear: () => setColor('') },
    shows('weeks') && weeks && { key: 'weeks', label: t.weeks, value: weeks, clear: () => setWeeks('') },
  ].filter((chip): chip is { key: string; label: string; value: string; clear: () => void } => Boolean(chip));
  const clearAll = () => chips.forEach((chip) => chip.clear());
  const filterCount = view.filters.filter((key) => key !== 'period').length;

  // Sorting by a column heading, on what the rows already hold. Until a heading is clicked, a ranking opens on its
  // usual column, highest first (best sellers on top); clicking the same heading turns it round (worst first).
  const activeSort: TableSort | undefined = sort ?? (view.sortBy ? { key: view.sortBy, direction: 'desc' } : undefined);
  const sorted = (rows: ReportResult['rows']) => {
    if (!activeSort) return rows;
    const factor = activeSort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a.cells[activeSort.key];
      const y = b.cells[activeSort.key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
      return String(x ?? '').localeCompare(String(y ?? '')) * factor;
    });
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        actions={
          view.report === 'vat' ? (
            <>
              <Button variant="secondary" onClick={() => void exportVat('excel')}>
                <Icon name="download" />
                {text.common.exportExcel}
              </Button>
              <Button variant="secondary" onClick={() => void exportVat('pdf')}>
                <Icon name="printer" />
                {text.common.exportPdf}
              </Button>
            </>
          ) : (
            state.status === 'success' && <ExportButtons title={title} subtitle={periodText} tables={() => tablesFor(state.data)} />
          )
        }
      />
      <Tabs<AnalysisSection>
        label={t.title}
        value={root.section}
        onChange={pickSection}
        tabs={sections.map((section) => ({ value: section, label: t.sections[section] }))}
      >
        <Stack gap={vars.spacing[5]}>
          {/* View by, the period, Filters and Compare: one row, as in most analytics tools. */}
          <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-end">
            {/* Sales: the same data sliced different ways (View by). Other areas: their own reports (Report). */}
            <SelectField
              label={root.section === 'sales' ? t.viewBy : t.report}
              value={root.id}
              onChange={pickView}
              width={vars.sizes.field.maxWidth}
              options={analysisViews.filter((current) => current.section === root.section).map((current) => ({ value: current.id, label: t.views[current.id as keyof typeof t.views] ?? current.id }))}
            />
            {shows('period') && <PeriodFilter period={period} />}
            {filterCount > 0 && (
              <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>
                <Icon name="filter" />
                {chips.length ? `${text.common.filters} (${format.number(chips.length)})` : text.common.filters}
              </Button>
            )}
            {(view.report === 'pnl' || Boolean(filter.branchId)) && view.report !== 'vat' && view.report !== 'shifts' && (
              <SegmentedControl<'reporting' | 'branch'>
                label={t.currency}
                value={currencyMode}
                onChange={setCurrencyMode}
                options={[
                  { value: 'reporting', label: t.currencyModes.reporting },
                  { value: 'branch', label: t.currencyModes.branch },
                ]}
              />
            )}
            {canCompare && <Checkbox label={t.compare} checked={compare === '1'} onChange={(checked) => setCompare(checked ? '1' : '')} />}
          </Stack>

          {filtersOpen && filterCount > 0 && (
            <Card
              title={text.common.filters}
              actions={
                <Button size="sm" variant="muted" onClick={() => setFiltersOpen(false)}>
                  {text.common.close}
                </Button>
              }
            >
              <FilterBar>
                {shows('branch') && <BranchSelect kinds={['store', 'online', 'warehouse']} includeArchived allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />}
                {shows('brand') && <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />}
                {shows('category') && <CategorySelect allLabel={text.owner.fields.allCategories} value={categoryId} onChange={setCategoryId} />}
                {shows('staff') && (
                  <SelectField label={t.groupings.cashier} placeholder={text.owner.fields.allStaff} value={cashierId} onChange={setCashierId} options={users.filter((user) => user.branchIds.length > 0).map((user) => ({ value: user.id, label: user.name }))} />
                )}
                {shows('payment') && (
                  <SelectField label={t.groupings.paymentMethod} placeholder={text.common.all} value={paymentMethodId} onChange={setPaymentMethodId} options={settings.paymentMethods.map((method) => ({ value: method.id, label: format.text(method.name) }))} />
                )}
                {shows('channel') && (
                  <SelectField label={t.groupings.channel} placeholder={text.common.all} value={channel} onChange={setChannel} options={(['store', 'online'] as const).map((value) => ({ value, label: t.channels[value] }))} />
                )}
                {shows('size') && <SizeSelect allLabel={text.common.all} value={size} onChange={setSize} />}
                {shows('color') && <ColorSelect allLabel={text.common.all} value={color} onChange={setColor} />}
                {shows('weeks') && <TextField label={t.weeks} type="number" min={1} value={weeks} placeholder={String(6)} onChange={setWeeks} />}
              </FilterBar>
            </Card>
          )}

          {chips.length > 0 && (
            <Stack direction="row" wrap gap={vars.spacing[2]} align="center">
              {chips.map((chip) => (
                <Button key={chip.key} size="sm" variant="secondary" onClick={chip.clear}>
                  {`${chip.label}: ${chip.value}`}
                  <Icon name="close" />
                </Button>
              ))}
              <Button size="sm" variant="muted" onClick={clearAll}>
                {text.common.clearFilters}
              </Button>
            </Stack>
          )}

          {trail.length > 0 && (
            <nav aria-label={t.viewBy}>
              <Stack direction="row" wrap gap={vars.spacing[1]} align="center">
                <Button size="sm" variant="muted" onClick={() => setTrail([])}>
                  {t.views[root.id as keyof typeof t.views] ?? root.id}
                </Button>
                {trail.map((step, index) => (
                  <Stack key={`${step.view}-${step.label}`} direction="row" gap={vars.spacing[1]} align="center">
                    <Icon name="chevronEnd" />
                    <Button size="sm" variant={index === trail.length - 1 ? 'secondary' : 'muted'} onClick={() => setTrail(trail.slice(0, index + 1))}>
                      {step.label}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </nav>
          )}

          <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
            {(result) =>
              result.rows.length === 0 ? (
                <Notice>{text.common.noResults}</Notice>
              ) : (
                <Stack gap={vars.spacing[2]}>
                  <Table
                    label={title}
                    nowrap
                    sort={activeSort}
                    onSortChange={setSort}
                    columns={result.columns.map((column) => {
                      const info = (t.columnInfo as Record<string, string>)[column.key];
                      return {
                        key: column.key,
                        label: (
                          <>
                            {columnLabel(column.key)}
                            {info && <InfoTip text={info} />}
                          </>
                        ),
                        align: column.kind === 'text' || column.kind === 'date' || column.kind === 'dateTime' ? ('start' as const) : ('end' as const),
                        wrap: column.key === 'items',
                        sortable: true,
                      };
                    })}
                    rows={sorted(result.rows).map((row) => {
                      const name = String(row.cells.name ?? row.cells.date ?? row.key);
                      const canDrill = Boolean(view.drill?.filter(row.key));
                      return {
                        key: row.key,
                        onClick: canDrill ? () => drillInto(row.key, view.groupBy === 'date' ? format.date(name) : word({ key: 'name', kind: 'text' }, name)) : undefined,
                        cells: Object.fromEntries(result.columns.map((column) => [column.key, cellWithChange(column, row.cells[column.key] ?? null, result.previous?.[row.key]?.[column.key], row.currency ?? result.currency)])),
                      };
                    })}
                    footer={result.totals ? Object.fromEntries(result.columns.map((column) => [column.key, cellWithChange(column, result.totals?.[column.key] ?? null, result.previousTotals?.[column.key], result.currency)])) : undefined}
                  />
                  <Text variant="caption" color={vars.colors.textMuted}>
                    {fillText(t.footnote, { currency: result.currency })}
                  </Text>
                </Stack>
              )
            }
          </AsyncContent>
        </Stack>
      </Tabs>
    </Stack>
  );
};
