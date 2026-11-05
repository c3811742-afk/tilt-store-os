import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { comparableReports, reportGroupings, reportIds, runReport, vatExport, type ReportCell, type ReportColumn, type ReportGrouping, type ReportId, type ReportResult } from '@/shared/api';
import { AsyncContent, Button, Checkbox, FilterBar, Icon, Notice, PageHeader, SegmentedControl, Stack, Table, Text, TextField } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { changePercent, fillText, type ExportCell, type ExportTable } from '@/shared/utils';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { BranchSelect, BrandSelect, ExportButtons, PeriodFilter } from '../../components';
import { useExport, usePeriod } from '../../hooks';

const isReportId = (value: string): value is ReportId => (reportIds as readonly string[]).includes(value);

// Any report: filters, grouping, currency, comparison with the previous period, and export to Excel or PDF.
export const ReportPage = () => {
  const { reportId = '' } = useParams();
  return isReportId(reportId) ? <Report id={reportId} /> : <NotFoundPage />;
};

const Report = ({ id }: { id: ReportId }) => {
  const { text } = useLocale();
  const format = useFormat();
  const exporter = useExport();
  const period = usePeriod('month');
  const groupings = (reportGroupings as Partial<Record<ReportId, readonly ReportGrouping[]>>)[id];
  const [groupBy, setGroupBy] = useQueryState<string>('group', groupings?.[0] ?? '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [currencyMode, setCurrencyMode] = useQueryState<'reporting' | 'branch'>('currency', 'reporting');
  const [compare, setCompare] = useQueryState('compare', '');
  const [weeks, setWeeks] = useQueryState('weeks', '');
  const version = useLiveVersion();
  const t = text.owner.reports;
  const filter = {
    range: period.range,
    branchId: branchId || undefined,
    brandId: brandId || undefined,
    groupBy: (groupBy || undefined) as ReportGrouping | undefined,
    currencyMode,
    compare: compare === '1',
    weeks: weeks ? Number(weeks) : undefined,
  };
  const state = useAsync(() => runReport(id, filter), [id, period.range.from, period.range.to, branchId, brandId, groupBy, currencyMode, compare, weeks, version]);
  const canCompare = comparableReports.includes(id);
  const title = t.list[id].title;
  const periodText = `${format.date(period.range.from)} – ${format.date(period.range.to)}`;

  // Words stored in the data (statuses, models, channels) shown in the active language.
  const word = (column: ReportColumn, value: ReportCell): string => {
    if (value === 'total') return text.common.total;
    if (typeof value !== 'string') return '';
    if (column.key === 'status') return (t.statusWords as Record<string, string>)[value] ?? value;
    if (column.key === 'model') return (text.owner.brands.terms.models as Record<string, string>)[value] ?? value;
    if (column.key === 'name' && groupBy === 'channel') return (t.channels as Record<string, string>)[value] ?? value;
    if (column.key === 'name' && id === 'vat') return format.country(value);
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
  const exportValue = (column: ReportColumn, value: ReportCell, currency: string): ExportCell =>
    typeof value === 'number' && (column.kind === 'money' || column.kind === 'number' || column.kind === 'percent') ? Math.round(value * 100) / 100 : show(column, value, currency);

  const tablesFor = (result: ReportResult): ExportTable[] => [
    {
      title,
      headers: result.columns.map((column) => t.columns[column.key as keyof typeof t.columns] ?? column.key),
      rows: [
        ...result.rows.map((row) => result.columns.map((column) => exportValue(column, row.cells[column.key] ?? null, row.currency ?? result.currency))),
        ...(result.totals ? [result.columns.map((column) => exportValue(column, result.totals?.[column.key] ?? null, result.currency))] : []),
      ],
    },
  ];

  // Sales and VAT per country, each in its own currency: one sheet (or page) per country.
  const exportVat = async (kind: 'excel' | 'pdf') => {
    const countries = await vatExport(period.range);
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

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader back={{ to: routes.owner.reports, label: t.title }} title={title} subtitle={t.list[id].description} />
      <Stack gap={vars.spacing[3]}>
        {id !== 'lowStock' && id !== 'slowMovers' && <PeriodFilter period={period} />}
        <FilterBar
          actions={
            id === 'vat' ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => void exportVat('excel')}>
                  <Icon name="download" />
                  {text.common.exportExcel}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void exportVat('pdf')}>
                  <Icon name="printer" />
                  {text.common.exportPdf}
                </Button>
              </>
            ) : (
              state.status === 'success' && <ExportButtons title={title} subtitle={periodText} tables={() => tablesFor(state.data)} />
            )
          }
        >
          <BranchSelect kinds={['store', 'online', 'warehouse']} includeArchived allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
          {id !== 'vat' && id !== 'shifts' && id !== 'transfers' && <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />}
          {id === 'slowMovers' && <TextField label={t.weeks} type="number" min={1} value={weeks} placeholder={String(6)} onChange={setWeeks} />}
        </FilterBar>
        <Stack direction="row" wrap gap={vars.spacing[4]} align="center">
          {groupings && (
            <SegmentedControl label={t.groupBy} value={groupBy} onChange={setGroupBy} options={groupings.map((value) => ({ value, label: t.groupings[value] }))} />
          )}
          {(id === 'pnl' || Boolean(branchId)) && id !== 'vat' && id !== 'shifts' && (
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
      </Stack>
      <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
        {(result) =>
          result.rows.length === 0 ? (
            <Notice>{text.common.noResults}</Notice>
          ) : (
            <Stack gap={vars.spacing[2]}>
              <Text variant="caption" color={vars.colors.textMuted}>
                {fillText(t.footnote, { currency: result.currency })}
              </Text>
              <Table
                label={title}
                columns={result.columns.map((column) => ({ key: column.key, label: t.columns[column.key as keyof typeof t.columns] ?? column.key, align: column.kind === 'text' || column.kind === 'date' || column.kind === 'dateTime' ? 'start' : 'end' }))}
                rows={result.rows.map((row) => ({
                  key: row.key,
                  cells: Object.fromEntries(result.columns.map((column) => [column.key, cellWithChange(column, row.cells[column.key] ?? null, result.previous?.[row.key]?.[column.key], row.currency ?? result.currency)])),
                }))}
                footer={result.totals ? Object.fromEntries(result.columns.map((column) => [column.key, cellWithChange(column, result.totals?.[column.key] ?? null, result.previousTotals?.[column.key], result.currency)])) : undefined}
              />
            </Stack>
          )
        }
      </AsyncContent>
    </Stack>
  );
};
