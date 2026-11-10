import { useState } from 'react';
import { useNavigate } from 'react-router';
import { checkImport, importProducts, type ImportCheck, type ImportRow } from '@/shared/api';
import { Badge, Button, Card, FileField, Icon, Notice, PageHeader, Stack, Table, Text } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { downloadBlob, fillText, readSpreadsheet, toExcel } from '@/shared/utils';

// The columns of the import file, in order. Prices have one column per selling currency ("Price EGP").
const fixedColumns = ['brand', 'category', 'name', 'size', 'color', 'sku', 'barcode', 'cost', 'season', 'collection'] as const;

// Imports products from Excel (.xlsx, .xls or .csv): one row per variant. Rows are checked first; only rows
// without problems are saved.
export const ImportProductsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branches } = useReference();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const [checks, setChecks] = useState<ImportCheck[] | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const t = text.owner.products.importPage;
  const currencies = [...new Set(branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse').map((branch) => branch.currency))];
  const headers = [...fixedColumns.map((column) => t.columns[column]), ...currencies.map((currency) => fillText(t.priceColumn, { currency }))];

  const downloadTemplate = () =>
    downloadBlob(toExcel([{ title: t.title, headers, rows: [['Kracked Studios', 'T-shirts', 'Graphic tee', 'M', 'Black', '', '', 350, 'Winter 2026', 'Core', ...currencies.map(() => 0)]] }]), 'products-template.xls');

  const read = async (file: File) => {
    setImported(null);
    const rows = await readSpreadsheet(file);
    const [, ...body] = rows; // the first row holds the column names
    const parsed: ImportRow[] = body
      .filter((row) => row.some(Boolean))
      .map((row, index) => {
        const cell = (column: number) => (row[column] ?? '').trim();
        return {
          line: index + 2,
          brand: cell(0),
          category: cell(1),
          name: cell(2),
          size: cell(3),
          color: cell(4),
          sku: cell(5),
          barcode: cell(6),
          cost: Number(cell(7)) || 0,
          season: cell(8),
          collection: cell(9),
          prices: Object.fromEntries(currencies.map((currency, offset) => [currency, Number(cell(fixedColumns.length + offset))]).filter(([, price]) => Number(price) > 0)),
        };
      });
    return checkImport(parsed);
  };

  const valid = checks?.filter((check) => !check.problems.length) ?? [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} back={{ to: routes.owner.products, label: text.owner.products.title }} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error) || text.errors.invalidFile}</Notice>}
      {imported !== null && (
        <Notice tone="success" action={<Button variant="secondary" size="sm" onClick={() => navigate(routes.owner.products)}>{text.common.viewAll}</Button>}>
          {fillText(t.done, { count: format.number(imported) })}
        </Notice>
      )}
      <Card title={t.step1}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {fillText(t.columnsHint, { columns: headers.join(', ') })}
        </Text>
        <Stack direction="row">
          <Button variant="secondary" onClick={downloadTemplate}>
            <Icon name="download" />
            {t.template}
          </Button>
        </Stack>
      </Card>
      <Card title={t.step2}>
        <FileField
          label={t.file}
          accept=".xlsx,.xls,.csv"
          value={null}
          onChange={async (picked) => {
            if (!picked) return;
            const blob = await (await fetch(picked.dataUrl)).blob();
            const result = await action.run('read', () => read(new File([blob], picked.name)));
            setChecks(result ?? null);
          }}
        />
      </Card>
      {checks && (
        <Card
          title={fillText(t.preview, { valid: format.number(valid.length), all: format.number(checks.length) })}
          actions={
            <Button
              disabled={!valid.length || Boolean(action.busy)}
              onClick={async () => {
                const count = await action.run('import', () => importProducts(valid.map((check) => check.row)));
                if (count !== undefined) {
                  setImported(count);
                  setChecks(null);
                }
              }}
            >
              {fillText(t.importValid, { count: format.number(valid.length) })}
            </Button>
          }
        >
          <Table filterable={false}
            label={t.title}
            columns={[
              { key: 'line', label: t.line, align: 'end' },
              { key: 'product', label: text.owner.fields.product },
              { key: 'variant', label: text.owner.fields.variant },
              { key: 'barcode', label: text.owner.fields.barcode },
              { key: 'problems', label: text.common.status },
            ]}
            rows={checks.map((check) => ({
              key: String(check.row.line),
              cells: {
                line: format.number(check.row.line),
                product: `${check.row.brand} · ${check.row.name}`,
                variant: `${check.row.size} · ${check.row.color}`,
                barcode: check.row.barcode || t.willGenerate,
                problems: check.problems.length ? (
                  <Stack direction="row" wrap gap={vars.spacing[1]}>
                    {check.problems.map((problem) => (
                      <Badge key={problem} variant="danger">
                        {t.problems[problem]}
                      </Badge>
                    ))}
                  </Stack>
                ) : (
                  <Badge variant="success">{t.ready}</Badge>
                ),
              },
            }))}
          />
        </Card>
      )}
    </Stack>
  );
};
