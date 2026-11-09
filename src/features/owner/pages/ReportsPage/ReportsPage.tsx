import { useState, type ReactNode } from 'react';
import { comparableReports, runReport, vatExport, type ReportCell, type ReportColumn, type ReportFilter, type ReportResult } from '@/shared/api';
import { AsyncContent, Button, Checkbox, Grid, Icon, InfoTip, Notice, PageHeader, SegmentedControl, SelectField, Stack, StatCard, Table, Tabs, Text } from '@/shared/components';
import { useAsync, useChange, useFormat, useLiveVersion, useLocale, useQueryState, useReference, useTableSort } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { changePercent, fillText, type ExportCell, type ExportTable } from '@/shared/utils';
import { ExportButtons, PeriodFilter, useAnalysisFilters } from '../../components';
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
  const { settings } = useReference();
  const period = usePeriod('month');
  const [viewId, setViewId] = useQueryState('view', defaultAnalysisView);
  const [currencyMode, setCurrencyMode] = useQueryState<'reporting' | 'branch'>('currency', 'reporting');
  const [compare, setCompare] = useQueryState('compare', '');
  const [trail, setTrail] = useState<DrillStep[]>([]);
  const version = useLiveVersion();
  const change = useChange();
  const t = text.owner.reports;

  const root = viewById(viewId);
  const view = trail.length ? viewById(trail[trail.length - 1].view) : root;
  const shows = (key: (typeof view.filters)[number]) => view.filters.includes(key);
  const filters = useAnalysisFilters(view.filters);
  // Until a heading is clicked, a ranking opens on its usual column, highest first (best sellers on top).
  const table = useTableSort(view.sortBy ? { key: view.sortBy, direction: 'desc' } : undefined);
  const base: ReportFilter = { range: period.range, ...filters.values, currencyMode, compare: compare === '1' };
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
    if (column.key === 'returnReason') return format.text(settings.lists.returnReasons.find((option) => option.id === value)?.label) || value;
    if (column.key === 'returnKind') return (t.returnKinds as Record<string, string>)[value] ?? value;
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
    ...(result.summary
      ? [{ title, headers: result.summary.map((column) => columnLabel(column.key)), rows: [result.summary.map((column) => exportValue(column, result.summaryValues?.[column.key] ?? null, result.currency))] }]
      : []),
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
    table.reset();
    setViewId(id);
  };

  // A tab opens on its usual view (Sales on Brand), otherwise on its first report.
  const pickSection = (section: AnalysisSection) => pickView(section === viewById(defaultAnalysisView).section ? defaultAnalysisView : (analysisViews.find((current) => current.section === section)?.id ?? defaultAnalysisView));

  const sorted = (rows: ReportResult['rows']) => table.sorted(rows, (row, key) => row.cells[key]);

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
            {filters.button}
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

          {filters.panel}
          {filters.chips}

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
                  {result.summary && (
                    <Grid minColumnWidth={vars.sizes.field.narrow}>
                      {result.summary.map((column) => {
                        const value = result.summaryValues?.[column.key];
                        const before = result.previousSummary?.[column.key];
                        return (
                          <StatCard
                            key={column.key}
                            label={columnLabel(column.key)}
                            value={show(column, value ?? null, result.currency)}
                            {...(filter.compare && typeof value === 'number' ? change(value, typeof before === 'number' ? before : 0, { lowerIsBetter: column.key !== 'exchangeRate' }) : {})}
                          />
                        );
                      })}
                    </Grid>
                  )}
                  <Table
                    label={title}
                    nowrap
                    sort={table.sort}
                    onSortChange={table.setSort}
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
