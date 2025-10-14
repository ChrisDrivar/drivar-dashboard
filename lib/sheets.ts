import { getSheetMatrix } from '@/lib/googleSheets';

const GVIZ_REGEX = /google\.visualization\.Query\.setResponse\((.*)\);/s;

const extractJson = (raw: string) => {
  const match = raw.match(GVIZ_REGEX);
  if (!match || !match[1]) {
    throw new Error('GViz response konnte nicht geparst werden');
  }
  return JSON.parse(match[1]);
};

const toMatrix = (payload: any): string[][] => {
  const header = payload.table.cols.map((col: any) => col.label || col.id || '');
  const rows = payload.table.rows.map((row: any) =>
    row.c.map((cell: any) => {
      if (!cell) return '';
      if (typeof cell.v === 'string') return cell.v;
      if (cell.v == null) return '';
      return String(cell.v);
    })
  );

  return [header, ...rows];
};

export async function getSheetValues(sheetName: string, range?: string) {
  const hasServiceAccount =
    Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

  if (hasServiceAccount) {
    const matrix = await getSheetMatrix(sheetName, range);
    if (matrix.length === 0) {
      return matrix;
    }

    if (!range) {
      return matrix;
    }

    const [startColumn] = range.split(':');
    if (!startColumn) {
      return matrix;
    }

    const columnIndex = startColumn.replace(/[^A-Z]/gi, '');
    if (!columnIndex) {
      return matrix;
    }

    const columnOffset =
      columnIndex
        .split('')
        .reduce((acc, char) => acc * 26 + (char.toUpperCase().charCodeAt(0) - 64), 0) - 1;

    const width = matrix.reduce((max, row) => Math.max(max, row.length), 0) - columnOffset;
    return matrix.map((row) => row.slice(columnOffset, columnOffset + width));
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: sheetName,
  });

  if (range) {
    params.set('range', range);
  }

  params.set('t', Date.now().toString());

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.statusText}`);
  }

  const text = await response.text();
  const payload = extractJson(text);
  return toMatrix(payload);
}
