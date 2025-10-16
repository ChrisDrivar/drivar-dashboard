import { google, sheets_v4 } from 'googleapis';

let sheetsClient: sheets_v4.Sheets | null = null;
const sheetIdCache = new Map<string, number>();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Google Sheets Zugriff ist nicht konfiguriert. Bitte Service-Account-Variablen setzen.');
  }

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, SCOPES);
  await auth.authorize();
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function getSheetIdByName(sheetName: string): Promise<number> {
  if (sheetIdCache.has(sheetName)) {
    return sheetIdCache.get(sheetName)!;
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const matchingSheet = response.data.sheets?.find(
    (sheet) => sheet.properties?.title?.toLowerCase() === sheetName.toLowerCase()
  );

  const sheetId = matchingSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`Tab "${sheetName}" wurde nicht gefunden`);
  }

  sheetIdCache.set(sheetName, sheetId);
  return sheetId;
}

export async function getHeaderRow(sheetName: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const sheets = await getSheetsClient();
  const range = `${sheetName}!1:1`;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values?.[0] ?? [];
}

export async function appendRows(range: string, rows: Array<Array<string | number | null | undefined>>) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows.map((row) => row.map((value) => (value == null ? '' : value))),
    },
  });
}

export async function updateRow(range: string, row: Array<string | number | null | undefined>) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row.map((value) => (value == null ? '' : value))],
    },
  });
}

export async function getSheetMatrix(sheetName: string, range?: string): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }

  const sheets = await getSheetsClient();
  const resolvedRange = range ? `${sheetName}!${range}` : sheetName;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: resolvedRange,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const values = response.data.values ?? [];
  if (values.length === 0) {
    return [];
  }

  const columnCount = values.reduce((max, row) => Math.max(max, row.length), 0);

  return values.map((row) => {
    const padded = [...row];
    while (padded.length < columnCount) {
      padded.push('');
    }
    return padded.map((cell) => {
      if (cell == null) return '';
      if (typeof cell === 'string') return cell;
      return String(cell);
    });
  });
}

export async function deleteRows(sheetName: string, rowIndices: number[]) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID ist nicht gesetzt');
  }
  if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
    return;
  }

  const sheetId = await getSheetIdByName(sheetName);
  const sheets = await getSheetsClient();
  const uniqueRows = Array.from(
    new Set(rowIndices.filter((row) => Number.isInteger(row) && row > 1))
  ).sort((a, b) => b - a);

  if (uniqueRows.length === 0) {
    return;
  }

  const requests: sheets_v4.Schema$Request[] = uniqueRows.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex - 1,
        endIndex: rowIndex,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}
