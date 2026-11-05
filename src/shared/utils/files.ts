// Reads a picked file into a data URL, so the demo can keep it with the record.
export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

export const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsText(file);
  });

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
};

export const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
};

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type ExportCell = string | number;
export interface ExportTable {
  title: string;
  headers: string[];
  rows: ExportCell[][];
}

// An Excel workbook (SpreadsheetML), one sheet per table. Opens in Excel, Numbers and Google Sheets, Arabic included.
export const toExcel = (tables: ExportTable[]) => {
  const cell = (value: ExportCell) =>
    typeof value === 'number' && Number.isFinite(value)
      ? `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
  const sheets = tables
    .map(
      (table) =>
        `<Worksheet ss:Name="${escapeXml(table.title.slice(0, 31))}"><Table>` +
        `<Row>${table.headers.map(cell).join('')}</Row>` +
        table.rows.map((row) => `<Row>${row.map(cell).join('')}</Row>`).join('') +
        '</Table></Worksheet>',
    )
    .join('');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    sheets +
    '</Workbook>';
  return new Blob([xml], { type: 'application/vnd.ms-excel' });
};

// Opens the tables in a print view; the browser's "Save as PDF" makes the PDF.
export const printTables = (tables: ExportTable[], options: { title: string; dir: 'ltr' | 'rtl'; lang: string; subtitle?: string }) => {
  const view = window.open('', '_blank');
  if (!view) throw new Error('The print window was blocked');
  const body = tables
    .map(
      (table) =>
        `<h2>${escapeXml(table.title)}</h2><table><thead><tr>${table.headers.map((header) => `<th>${escapeXml(header)}</th>`).join('')}</tr></thead>` +
        `<tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeXml(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
    )
    .join('');
  view.document.write(
    `<!doctype html><html lang="${options.lang}" dir="${options.dir}"><head><meta charset="utf-8"><title>${escapeXml(options.title)}</title>` +
      // The print view is a separate document outside the app, so it carries its own minimal print styles.
      '<style>body{font-family:system-ui,sans-serif;font-size:0.75rem;margin:1.5rem}table{border-collapse:collapse;width:100%;margin-block-end:1.5rem}' +
      'th,td{border:0.0625rem solid #ccc;padding:0.25rem 0.5rem;text-align:start}th{background:#f3f3f3}</style></head>' +
      `<body><h1>${escapeXml(options.title)}</h1>${options.subtitle ? `<p>${escapeXml(options.subtitle)}</p>` : ''}${body}</body></html>`,
  );
  view.document.close();
  view.focus();
  view.print();
};

// Parses a CSV (comma or semicolon separated, quoted values allowed) into rows of cells.
export const parseCsv = (content: string) => {
  const delimiter = (content.split('\n')[0].match(/;/g)?.length ?? 0) > (content.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};
