import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { appendRows, getHeaderRow } from '@/lib/googleSheets';
import { getSheetValues } from '@/lib/sheets';
import { mapOwners } from '@/lib/transform';
import { resolveCityCoordinates } from '@/lib/geo';

const INVENTORY_SHEET = 'inventory';
const OWNERS_SHEET = 'owners';
const INVENTORY_APPEND_RANGE = process.env.GOOGLE_SHEET_INVENTORY_RANGE ?? 'inventory';
const OWNERS_APPEND_RANGE = process.env.GOOGLE_SHEET_OWNERS_RANGE ?? 'owners';

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

const inventorySynonyms: Record<string, string[]> = {
  vermieter_name: ['vermieter', 'vermietername', 'partner'],
  fahrzeug_label: ['fahrzeug', 'fahrzeugname', 'fahrzeug_name', 'modell'],
  manufacturer: ['marke', 'brand'],
  fahrzeugtyp: ['typ', 'segment'],
  stadt: ['city', 'ort'],
  region: ['bundesland', 'staat', 'province'],
  standort: ['adresse', 'anschrift', 'adresszeile'],
  land: ['country'],
  status: ['state'],
  notizen: ['notes', 'kommentar', 'comment'],
  latitude: ['lat', 'breitengrad'],
  longitude: ['lng', 'laengengrad', 'längengrad'],
  plz: ['postal_code', 'postleitzahl', 'zip', 'zip_code'],
  strasse: ['strasse', 'straße', 'stra_e', 'street', 'straße_hausnummer', 'stra_e_hausnummer'],
  street: ['strasse', 'straße', 'stra_e', 'str', 'str_hausnummer'],
  letzte_aenderung: [
    'letzte_aenderung',
    'letzte_änderung',
    'letzte_anderung',
    'last_change',
    'last_update',
  ],
  listed_at: ['listed_at', 'online_seit', 'onboarded_at'],
};

const ownerSynonyms: Record<string, string[]> = {
  vermieter_name: ['vermieter', 'partner', 'name'],
  land: ['country'],
  region: ['bundesland', 'staat', 'province'],
  stadt: ['city', 'ort'],
  adresse: ['standort', 'anschrift'],
  telefon: ['phone'],
  email: ['mail'],
  domain: ['website', 'url'],
  plz: ['postal_code', 'postleitzahl', 'zip', 'zip_code'],
  strasse: ['street', 'straße', 'stra_e', 'strasse', 'straße_hausnummer', 'stra_e_hausnummer'],
  internationale_kunden: ['international', 'intl_kunden', 'international_customers'],
  provision: ['commission', 'provision_satze', 'provision_satz'],
  ranking: ['bewertung'],
  erfahrung_jahre: ['erfahrung', 'experience_years'],
  notizen: ['notes', 'kommentar', 'comment'],
  letzte_aenderung: [
    'letzte_aenderung',
    'letzte_änderung',
    'letzte_anderung',
    'last_change',
    'last_update',
  ],
};

const normalize = (value: string) => value.trim().toLowerCase();

function buildRow(
  header: string[],
  valueMap: Record<string, string | number | null | undefined>,
  synonyms: Record<string, string[]>
) {
  return header.map((original) => {
    const normalized = normalizeKey(original);
    let canonicalKey: string | undefined;
    if (normalized in valueMap) {
      canonicalKey = normalized;
    } else {
      canonicalKey = Object.keys(valueMap).find((key) => synonyms[key]?.includes(normalized));
    }

    const rawValue = canonicalKey ? valueMap[canonicalKey] : '';
    if (rawValue == null) return '';
    return typeof rawValue === 'number' ? rawValue : String(rawValue);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const owner = body?.owner;
    const vehiclesInput = Array.isArray(body?.vehicles) ? body.vehicles : [];

    if (!owner || vehiclesInput.length === 0) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }

    const ownerName = (owner.name ?? '').trim();
    const country = (owner.country ?? '').trim();
    const region = (owner.region ?? '').trim();
    const city = (owner.city ?? '').trim();
    const street = (owner.street ?? '').trim();
    const postalCode = (owner.postalCode ?? '').trim();
    const explicitAddress = (owner.address ?? '').trim();
    const address = explicitAddress || [street, postalCode, city].filter(Boolean).join(', ');

    type PreparedVehicle = {
      label: string;
      vehicleType: string;
      manufacturer: string;
      status: string;
      notes: string;
    };

    const preparedVehicles: PreparedVehicle[] = vehiclesInput
      .map((vehicle: any) => ({
        label: (vehicle?.label ?? '').trim(),
        vehicleType: (vehicle?.vehicleType ?? '').trim(),
        manufacturer: (vehicle?.manufacturer ?? '').trim(),
        status: (vehicle?.status ?? 'aktiv').trim() || 'aktiv',
        notes: (vehicle?.notes ?? '').trim(),
      }))
      .filter((vehicle: PreparedVehicle) => vehicle.label.length > 0);

    if (!ownerName || !country || !city || preparedVehicles.length === 0) {
      return NextResponse.json(
        { error: 'Bitte Vermietername, Land, Stadt und mindestens ein Fahrzeug ausfüllen.' },
        { status: 400 }
      );
    }

    let geocode = await geocodeAddress({
      street: [street, postalCode].filter(Boolean).join(' ') || explicitAddress,
      city,
      region,
      country,
    });

    if (!geocode) {
      const fallbackCoordinate = resolveCityCoordinates(city, country);
      if (fallbackCoordinate) {
        geocode = {
          latitude: fallbackCoordinate.latitude,
          longitude: fallbackCoordinate.longitude,
          label: `${city}, ${country}`,
        };
      }
    }

    const inventoryHeader = await getHeaderRow(INVENTORY_SHEET);
    if (inventoryHeader.length === 0) {
      return NextResponse.json(
        { error: 'Inventar-Tab hat keine Kopfzeile. Bitte Sheet prüfen.' },
        { status: 500 }
      );
    }

    const listedAtIso = new Date().toISOString().split('T')[0];

    const inventoryRows = preparedVehicles.map((vehicle) =>
      buildRow(
        inventoryHeader,
        {
          vermieter_name: ownerName,
          fahrzeug_label: vehicle.label,
          manufacturer: vehicle.manufacturer,
          fahrzeugtyp: vehicle.vehicleType,
          stadt: city,
          region,
          standort: address,
          land: country,
          status: vehicle.status,
          notizen: vehicle.notes,
          latitude: geocode?.latitude ?? null,
          longitude: geocode?.longitude ?? null,
          plz: postalCode,
          strasse: street,
          listed_at: listedAtIso,
          letzte_aenderung: listedAtIso,
        },
        inventorySynonyms
      )
    );

    await appendRows(INVENTORY_APPEND_RANGE, inventoryRows);

    const ownersSheet = await getSheetValues(OWNERS_SHEET);
    const existingOwners = mapOwners(ownersSheet);
    const ownerExists = existingOwners.some(
      (existing) => normalize(existing.vermieterName) === normalize(ownerName)
    );

    if (!ownerExists) {
      const ownersHeader = await getHeaderRow(OWNERS_SHEET);
      if (ownersHeader.length > 0) {
        const ownerRow = buildRow(
          ownersHeader,
          {
            vermieter_name: ownerName,
            land: country,
            region,
            stadt: city,
            adresse: address,
            telefon: (owner.phone ?? '').trim(),
            email: (owner.email ?? '').trim(),
            domain: (owner.website ?? '').trim(),
            plz: postalCode,
            strasse: street,
            internationale_kunden: (owner.internationalCustomers ?? '').trim(),
            provision: (owner.commission ?? '').trim(),
            ranking: (owner.ranking ?? '').trim(),
            erfahrung_jahre: (owner.experienceYears ?? '').trim(),
            notizen: (owner.notes ?? '').trim(),
            letzte_aenderung:
              typeof owner.lastChangeIso === 'string' && owner.lastChangeIso
                ? owner.lastChangeIso.split('T')[0]
                : new Date().toISOString().split('T')[0],
          },
          ownerSynonyms
        );
        await appendRows(OWNERS_APPEND_RANGE, [ownerRow]);
      }
    }

    if (!geocode) {
      console.warn('[partners-api] Geocoding fehlgeschlagen, Fahrzeug wird mit leeren Koordinaten angelegt', {
        ownerName,
        city,
        country,
      });
    }

    return NextResponse.json({ success: true, coordinates: geocode ?? null });
  } catch (error) {
    console.error('[partners-api] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}
