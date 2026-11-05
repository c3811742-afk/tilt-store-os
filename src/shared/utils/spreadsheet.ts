import { parseCsv, readFileAsText } from './files';

// Reads the first sheet of a spreadsheet into rows of text cells: Excel (.xlsx), the Excel files this
// system exports (.xls, SpreadsheetML), or CSV. No library: .xlsx is a zip of XML files, unzipped with the
// browser's DecompressionStream.

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  offset: number;
}

const readZipEntries = (bytes: Uint8Array): ZipEntry[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endSignature = 0x06054b50;
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== endSignature) end -= 1;
  if (end < 0) throw new Error('Not a zip file');
  const count = view.getUint16(end + 10, true);
  let pointer = view.getUint32(end + 16, true);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index += 1) {
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const offset = view.getUint32(pointer + 42, true);
    entries.push({ name: decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength)), method, compressedSize, offset });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

const readZipFile = async (bytes: Uint8Array, entry: ZipEntry) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const data = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(data);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
};

const columnIndex = (reference: string) => [...reference.replace(/\d+/g, '')].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;

const readXlsx = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = readZipEntries(bytes);
  const find = (name: string) => entries.find((entry) => entry.name === name);
  const parser = new DOMParser();
  const sharedEntry = find('xl/sharedStrings.xml');
  const shared = sharedEntry
    ? [...parser.parseFromString(await readZipFile(bytes, sharedEntry), 'application/xml').getElementsByTagName('si')].map((item) =>
        [...item.getElementsByTagName('t')].map((node) => node.textContent ?? '').join(''),
      )
    : [];
  const sheetEntry = find('xl/worksheets/sheet1.xml') ?? entries.find((entry) => entry.name.startsWith('xl/worksheets/sheet'));
  if (!sheetEntry) throw new Error('No sheet found');
  const sheet = parser.parseFromString(await readZipFile(bytes, sheetEntry), 'application/xml');
  return [...sheet.getElementsByTagName('row')].map((row) => {
    const cells: string[] = [];
    [...row.getElementsByTagName('c')].forEach((cell) => {
      const type = cell.getAttribute('t');
      const value = cell.getElementsByTagName('v')[0]?.textContent ?? cell.getElementsByTagName('t')[0]?.textContent ?? '';
      cells[columnIndex(cell.getAttribute('r') ?? 'A')] = type === 's' ? (shared[Number(value)] ?? '') : value;
    });
    return Array.from(cells, (cell) => (cell ?? '').trim());
  });
};

const readSpreadsheetMl = (content: string) => {
  const sheet = new DOMParser().parseFromString(content, 'application/xml');
  return [...sheet.getElementsByTagName('Row')].map((row) => [...row.getElementsByTagName('Cell')].map((cell) => (cell.textContent ?? '').trim()));
};

export const readSpreadsheet = async (file: File): Promise<string[][]> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return readXlsx(file);
  const content = await readFileAsText(file);
  if (content.trimStart().startsWith('<?xml')) return readSpreadsheetMl(content);
  return parseCsv(content);
};
