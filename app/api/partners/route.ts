import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { appendRows, deleteRows, getHeaderRow } from '@/lib/googleSheets';
import { getSheetValues } from '@/lib/sheets';
import { mapOwners } from '@/lib/transform';
import { resolveCityCoordinates } from '@/lib/geo';
import { buildRow, inventorySynonyms, ownerSynonyms } from '@/lib/partnerSheet';

const INVENTORY_SHEET = 'inventory';
const OWNERS_SHEET = 'owners';
const INVENTORY_APPEND_RANGE = process.env.GOOGLE_SHEET_INVENTORY_RANGE ?? 'inventory';
const OWNERS_APPEND_RANGE = process.env.GOOGLE_SHEET_OWNERS_RANGE ?? 'owners';

const normalize = (value: string) => value.trim().toLowerCase();
const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ownerName = typeof body?.ownerName === 'string' ? body.ownerName.trim() : '';
    if (!ownerName) {
      return NextResponse.json({ error: 'Vermietername fehlt' }, { status: 400 });
    }

    const normalizedOwner = normalize(ownerName);

    const inventorySheet = await getSheetValues(INVENTORY_SHEET);
    const [inventoryHeader, ...inventoryRows] = inventorySheet;
    if (!inventoryHeader) {
      return NextResponse.json(
        { error: 'Inventar-Tab konnte nicht geladen werden.' },
        { status: 500 }
      );
    }

    const ownersSheet = await getSheetValues(OWNERS_SHEET);
    const [ownersHeader, ...ownersRows] = ownersSheet;
    if (!ownersHeader) {
      return NextResponse.json(
        { error: 'Vermieter-Tab konnte nicht geladen werden.' },
        { status: 500 }
      );
    }

    const resolveColumnIndex = (header: string[], candidates: string[]) => {
      const normalizedHeader = header.map((column) => normalizeKey(column));
      for (const candidate of candidates) {
        const target = normalizeKey(candidate);
        const index = normalizedHeader.indexOf(target);
        if (index !== -1) {
          return index;
        }
      }
      return -1;
    };

    const inventoryOwnerIndex = resolveColumnIndex(inventoryHeader, [
      'vermieter_name',
      'vermieter',
      'partner',
      'name',
    ]);

    if (inventoryOwnerIndex === -1) {
      return NextResponse.json(
        { error: 'Spalte "Vermieter" im Inventar nicht gefunden.' },
        { status: 500 }
      );
    }

    const ownerNameIndex = resolveColumnIndex(ownersHeader, [
      'vermieter_name',
      'vermieter',
      'name',
      'partner',
    ]);

    if (ownerNameIndex === -1) {
      return NextResponse.json(
        { error: 'Spalte "Vermieter" im Vermieter-Tab nicht gefunden.' },
        { status: 500 }
      );
    }

    const inventoryRowIndices: number[] = [];
    inventoryRows.forEach((row, index) => {
      const cellValue = row[inventoryOwnerIndex] ?? '';
      if (normalize(cellValue) === normalizedOwner) {
        inventoryRowIndices.push(index + 2);
      }
    });

    const ownerRowIndices: number[] = [];
    ownersRows.forEach((row, index) => {
      const cellValue = row[ownerNameIndex] ?? '';
      if (normalize(cellValue) === normalizedOwner) {
        ownerRowIndices.push(index + 2);
      }
    });

    if (inventoryRowIndices.length === 0 && ownerRowIndices.length === 0) {
      return NextResponse.json(
        { error: 'Kein passender Vermieter gefunden.' },
        { status: 404 }
      );
    }

    await deleteRows(INVENTORY_SHEET, inventoryRowIndices);
    await deleteRows(OWNERS_SHEET, ownerRowIndices);

    return NextResponse.json({
      success: true,
      removedInventoryRows: inventoryRowIndices.length,
      removedOwnerRows: ownerRowIndices.length,
    });
  } catch (error) {
    console.error('[partners-api-delete] Fehler', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}
