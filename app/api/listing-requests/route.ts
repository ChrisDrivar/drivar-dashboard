import { NextRequest, NextResponse } from 'next/server';
import { appendRows, getHeaderRow, updateRow } from '@/lib/googleSheets';
import { getSheetValues } from '@/lib/sheets';
import { mapOwners } from '@/lib/transform';
import { geocodeAddress } from '@/lib/geocode';
import { buildRow as buildPartnerRow, inventorySynonyms, ownerSynonyms } from '@/lib/partnerSheet';
import { resolveCityCoordinates } from '@/lib/geo';
import { LEAD_STATUS_VALUES, LeadStatus } from '@/lib/leadStatus';

const SHEET_NAME = 'listing_requests';
const APPEND_RANGE = process.env.GOOGLE_SHEET_LISTING_REQUESTS_RANGE ?? SHEET_NAME;
const INVENTORY_SHEET = 'inventory';
const INVENTORY_APPEND_RANGE = process.env.GOOGLE_SHEET_INVENTORY_RANGE ?? 'inventory';
const OWNERS_SHEET = 'owners';
const OWNERS_APPEND_RANGE = process.env.GOOGLE_SHEET_OWNERS_RANGE ?? 'owners';

type PreparedVehicle = {
  vehicleLabel: string;
  manufacturer: string;
  vehicleType: string;
  comment: string;
};

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
  strasse: ['street', 'straße', 'adresszeile'],
  plz: ['postal_code', 'postleitzahl', 'zip', 'zip_code'],
  status: ['status'],
  status_updated_at: ['status_updated_at', 'status_geaendert', 'statusgeändert', 'status_date'],
};

const isValidStatus = (value: string): value is LeadStatus =>
  LEAD_STATUS_VALUES.includes(value as LeadStatus);

function buildListingRow(
  header: string[],
  values: Record<string, string | number | null | undefined>
) {
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

const columnIndexToLetter = (index: number) => {
  let result = '';
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

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

    const statusUpdatedAt = new Date().toISOString().split('T')[0];

    const rows = preparedVehicles.map((vehicle) =>
      buildListingRow(header, {
        datum: (lead?.date ?? '').trim() || new Date().toISOString().split('T')[0],
        kanal: (lead?.channel ?? '').trim(),
        region: (lead?.region ?? '').trim(),
        vermieter_name: landlord,
        fahrzeug_label: vehicle.vehicleLabel,
        manufacturer: vehicle.manufacturer,
        fahrzeugtyp: vehicle.vehicleType,
        stadt: city,
        land: (lead?.country ?? '').trim(),
        strasse: (lead?.street ?? '').trim(),
        plz: (lead?.postalCode ?? '').trim(),
        kommentar: vehicle.comment || (lead?.comment ?? '').trim(),
        status: (lead?.status ?? '').trim() || 'Angefragt',
        status_updated_at: statusUpdatedAt,
      })
    );

    await appendRows(APPEND_RANGE, rows);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[listing-requests-api] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const rowIndex = Number(body?.rowIndex);
    const statusValue = (body?.status ?? '').trim();
    const shouldCreatePartner = Boolean(
      body?.createPartner ?? statusValue === 'Vertrag unterschrieben'
    );

    if (!rowIndex || Number.isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Ungültige Zeile' }, { status: 400 });
    }

    if (!isValidStatus(statusValue)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
    }

    const lead = body?.lead ?? {};
    const vehiclesInput = Array.isArray(body?.vehicles) ? body.vehicles : [];

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

    const landlord = (lead?.landlord ?? '').trim();
    const city = (lead?.city ?? '').trim();
    const region = (lead?.region ?? '').trim();
    const country = (lead?.country ?? '').trim();
    const street = (lead?.street ?? '').trim();
    const postalCode = (lead?.postalCode ?? '').trim();

    const header = await getHeaderRow(SHEET_NAME);
    if (header.length === 0) {
      return NextResponse.json(
        { error: 'Tab "listing_requests" hat keine Kopfzeile. Bitte Sheet prüfen.' },
        { status: 500 }
      );
    }

    const statusUpdatedAt = new Date().toISOString().split('T')[0];

    const rowValues = buildListingRow(header, {
      datum: (lead?.date ?? '').trim() || new Date().toISOString().split('T')[0],
      kanal: (lead?.channel ?? '').trim(),
      region,
      vermieter_name: landlord,
      fahrzeug_label: preparedVehicles[0]?.vehicleLabel ?? (body?.vehicleLabel ?? '').trim(),
      manufacturer: preparedVehicles[0]?.manufacturer ?? (body?.manufacturer ?? '').trim(),
      fahrzeugtyp: preparedVehicles[0]?.vehicleType ?? (body?.vehicleType ?? '').trim(),
      stadt: city,
      land: country,
      strasse: street,
      plz: postalCode,
      kommentar:
        preparedVehicles[0]?.comment || (lead?.comment ?? '').trim() || (body?.comment ?? '').trim(),
      status: statusValue,
      status_updated_at: statusUpdatedAt,
    });

    const lastColumn = columnIndexToLetter(header.length);
    const range = `${SHEET_NAME}!A${rowIndex}:${lastColumn}${rowIndex}`;
    await updateRow(range, rowValues);

    if (statusValue === 'Vertrag unterschrieben' && shouldCreatePartner && preparedVehicles.length > 0) {
      await createPartnerFromLead(lead, preparedVehicles, statusUpdatedAt);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[listing-requests-api] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}

async function createPartnerFromLead(
  lead: Record<string, any>,
  vehicles: PreparedVehicle[],
  statusDate: string
) {
  try {
    const ownerName = (lead?.landlord ?? '').trim();
    const country = (lead?.country ?? '').trim();
    const city = (lead?.city ?? '').trim();

    if (!ownerName || !country || !city) {
      console.warn('[listing-requests-api] Partner-Anlage übersprungen: unvollständige Daten');
      return;
    }

    const region = (lead?.region ?? '').trim();
    const street = (lead?.street ?? '').trim();
    const postalCode = (lead?.postalCode ?? '').trim();
    const address = [street, postalCode, city].filter(Boolean).join(', ');

    let geocode = await geocodeAddress({
      street: street || undefined,
      city,
      region,
      country,
    });

    if (!geocode) {
      const resolved = resolveCityCoordinates(city, country);
      if (resolved) {
        geocode = { latitude: resolved.latitude, longitude: resolved.longitude, label: `${city}, ${country}` };
      }
    }

    const inventoryHeader = await getHeaderRow(INVENTORY_SHEET);
    if (inventoryHeader.length === 0) {
      console.error('[listing-requests-api] Inventar-Header fehlt, Partner-Anlage abgebrochen');
      return;
    }

    const inventoryRows = vehicles.map((vehicle, index) =>
      buildPartnerRow(
        inventoryHeader,
        {
          vermieter_name: ownerName,
          fahrzeug_label:
            vehicle.vehicleLabel || vehicle.vehicleType || `Fahrzeug ${index + 1}`,
          manufacturer: vehicle.manufacturer,
          fahrzeugtyp: vehicle.vehicleType,
          stadt: city,
          region,
          standort: address,
          land: country,
          status: 'aktiv',
          notizen: [vehicle.comment, (lead?.comment ?? '').trim()].filter(Boolean).join(' | '),
          latitude: geocode?.latitude ?? '',
          longitude: geocode?.longitude ?? '',
          plz: postalCode,
          strasse: street,
          listed_at: statusDate,
          letzte_aenderung: statusDate,
        },
        inventorySynonyms
      )
    );

    await appendRows(INVENTORY_APPEND_RANGE, inventoryRows);

    const ownersSheet = await getSheetValues(OWNERS_SHEET);
    const existingOwners = mapOwners(ownersSheet);
    const ownerExists = existingOwners.some(
      (existing) => normalizeName(existing.vermieterName) === normalizeName(ownerName)
    );

    if (!ownerExists) {
      const ownersHeader = await getHeaderRow(OWNERS_SHEET);
      if (ownersHeader.length > 0) {
        const ownerRow = buildPartnerRow(
          ownersHeader,
          {
            vermieter_name: ownerName,
            land: country,
            region,
            stadt: city,
            adresse: address,
            telefon: (lead?.phone ?? '').trim(),
            email: (lead?.email ?? '').trim(),
            domain: (lead?.website ?? '').trim(),
            plz: postalCode,
            strasse: street,
            notizen: (lead?.comment ?? '').trim(),
            letzte_aenderung: statusDate,
          },
          ownerSynonyms
        );
        await appendRows(OWNERS_APPEND_RANGE, [ownerRow]);
      }
    }
  } catch (error) {
    console.error('[listing-requests-api] Partner-Anlage fehlgeschlagen', error);
  }
}
