import { useLocale } from '@/shared/hooks';
import { downloadBlob, printTables, toExcel, toIsoDate, type ExportTable } from '@/shared/utils';

// Exports tables to Excel or PDF (print view) with the file named after the page and the date.
export const useExport = () => {
  const { theme } = useLocale();
  const fileName = (title: string) => `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}-${toIsoDate()}`;
  return {
    excel: (title: string, tables: ExportTable[]) => downloadBlob(toExcel(tables), `${fileName(title)}.xls`),
    pdf: (title: string, tables: ExportTable[], subtitle?: string) => printTables(tables, { title, subtitle, dir: theme.dir, lang: theme.lang }),
  };
};
