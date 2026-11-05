import { Button, Icon } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import type { ExportTable } from '@/shared/utils';
import { useExport } from '../../hooks';

export interface ExportButtonsProps {
  title: string;
  tables: () => ExportTable[]; // built only when a button is pressed
  subtitle?: string;
}

// "Export to Excel" and "Export to PDF" for any table on a page.
export const ExportButtons = ({ title, tables, subtitle }: ExportButtonsProps) => {
  const { text } = useLocale();
  const exporter = useExport();
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => exporter.excel(title, tables())}>
        <Icon name="download" />
        {text.common.exportExcel}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => exporter.pdf(title, tables(), subtitle)}>
        <Icon name="printer" />
        {text.common.exportPdf}
      </Button>
    </>
  );
};
