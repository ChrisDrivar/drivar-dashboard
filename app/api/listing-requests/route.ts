import { NextRequest, NextResponse } from 'next/server';
import { appendRows, getHeaderRow } from '@/lib/googleSheets';

const SHEET_NAME = 'listing_requests';
const APPEND_RANGE = process.env.GOOGLE_SHEET_LISTING_REQUESTS_RANGE ?? SHEET_NAME;

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

const synonyms: Record<string, string[]> = {
  datum: ['date'],
  kanal: ['channel', 'quelle'],
  region: ['bundesland', 'state'],
  vermieter_name: ['vermieter', 'name', 'partner'],
  fahrzeug_label: ['fahrzeug', 'modell'],
  manufacturer: ['marke', 'brand'],
  fahrzeugtyp: ['typ', 'segment'],
  stadt: ['city', 'ort'],
  land: ['country'],
  kommentar: ['notes', 'bemerkung'],
};

function buildRow(header: string[], values: Record<string, string | number | null | undefined>) {
  return header.map((original) => {
    const key = normalizeKey(original);
    const canonical =
      key in values
        ? key
        : Object.keys(values).find((candidate) => synonyms[candidate]?.includes(key));

    const raw = canonical ? values[canonical] : '';
    if (raw == null) return '';
    return typeof raw === 'number' ? raw : String(raw);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lead = body?.lead ?? body ?? {};
    const vehiclesInput = Array.isArray(body?.vehicles)
      ? body.vehicles
      : body?.vehicleType || body?.vehicleLabel
      ? [
          {
            vehicleLabel: body?.vehicleLabel,
            manufacturer: body?.manufacturer,
            vehicleType: body?.vehicleType,
            comment: body?.comment,
          },
        ]
      : [];

    const landlord = (lead?.landlord ?? '').trim();
    const city = (lead?.city ?? body?.city ?? '').trim();

    if (!landlord || !city || vehiclesInput.length === 0) {
      return NextResponse.json(
        { error: 'Bitte Vermieter, Stadt und mindestens ein Fahrzeug angeben.' },
        { status: 400 }
      );
    }

    type PreparedVehicle = {
      vehicleLabel: string;
      manufacturer: string;
      vehicleType: string;
      comment: string;
    };

    const preparedVehicles: PreparedVehicle[] = vehiclesInput
      .map((vehicle: any) => ({
        vehicleLabel: (vehicle?.vehicleLabel ?? '').trim(),
        manufacturer: (vehicle?.manufacturer ?? '').trim(),
        vehicleType: (vehicle?.vehicleType ?? '').trim(),
        comment: (vehicle?.comment ?? '').trim(),
      }))
      .filter(
        (vehicle: PreparedVehicle) =>
          vehicle.vehicleType.length > 0 || vehicle.vehicleLabel.length > 0
      );

    if (preparedVehicles.length === 0) {
      return NextResponse.json(
        { error: 'Bitte mindestens ein Fahrzeug mit Typ erfassen.' },
        { status: 400 }
      );
    }

    const header = await getHeaderRow(SHEET_NAME);
    if (header.length === 0) {
      return NextResponse.json(
        { error: 'Tab "listing_requests" hat keine Kopfzeile. Bitte Sheet prüfen.' },
        { status: 500 }
      );
    }

    const rows = preparedVehicles.map((vehicle) =>
      buildRow(header, {
        datum: (lead?.date ?? '').trim() || new Date().toISOString().split('T')[0],
        kanal: (lead?.channel ?? '').trim(),
        region: (lead?.region ?? '').trim(),
        vermieter_name: landlord,
        fahrzeug_label: vehicle.vehicleLabel,
        manufacturer: vehicle.manufacturer,
        fahrzeugtyp: vehicle.vehicleType,
        stadt: city,
        land: (lead?.country ?? '').trim(),
        kommentar: vehicle.comment || (lead?.comment ?? '').trim(),
      })
    );

    await appendRows(APPEND_RANGE, rows);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[listing-requests-api] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}
