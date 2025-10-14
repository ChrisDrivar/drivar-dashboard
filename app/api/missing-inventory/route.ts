import { NextRequest, NextResponse } from 'next/server';
import { appendRows, getHeaderRow } from '@/lib/googleSheets';

const SHEET_NAME = 'missing inventory';
const APPEND_RANGE = process.env.GOOGLE_SHEET_MISSING_INVENTORY_RANGE ?? SHEET_NAME;

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

const synonyms: Record<string, string[]> = {
  stadt: ['city', 'ort'],
  region: ['bundesland', 'state', 'region'],
  land: ['country'],
  fahrzeugtyp: ['fahrzeug_typ', 'typ', 'segment'],
  anzahl_fehlend: ['anzahl', 'missing', 'anzahl_missing'],
  prio: ['prioritaet', 'priorität', 'priority'],
  kommentar: ['notes', 'bemerkung', 'note'],
};

function buildRow(
  header: string[],
  values: Record<string, string | number | null | undefined>,
  synonymMap: Record<string, string[]>
) {
  return header.map((original) => {
    const key = normalizeKey(original);
    const canonical =
      key in values
        ? key
        : Object.keys(values).find((candidate) => synonymMap[candidate]?.includes(key));

    const raw = canonical ? values[canonical] : '';
    if (raw == null) return '';
    return typeof raw === 'number' ? raw : String(raw);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const city = (body?.city ?? '').trim();
    const vehicleType = (body?.vehicleType ?? '').trim();
    const countRaw = body?.count;
    const priority = (body?.priority ?? '').trim();
    const comment = (body?.comment ?? '').trim();
    const region = (body?.region ?? '').trim();
    const country = (body?.country ?? '').trim();

    const count = Number(countRaw);
    if (!city || !vehicleType || Number.isNaN(count) || count <= 0) {
      return NextResponse.json(
        { error: 'Bitte Stadt, Fahrzeugtyp und eine positive Anzahl angeben.' },
        { status: 400 }
      );
    }

    const header = await getHeaderRow(SHEET_NAME);
    if (header.length === 0) {
      return NextResponse.json(
        { error: 'Tab "missing inventory" hat keine Kopfzeile. Bitte Sheet prüfen.' },
        { status: 500 }
      );
    }

    const row = buildRow(
      header,
      {
        stadt: city,
        region,
        land: country,
        fahrzeugtyp: vehicleType,
        anzahl_fehlend: count,
        prio: priority,
        kommentar: comment,
      },
      synonyms
    );

    await appendRows(APPEND_RANGE, [row]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[missing-inventory-api] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}
