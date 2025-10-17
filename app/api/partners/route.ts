import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';
import { appendRows, deleteRows, getHeaderRow, updateRow } from '@/lib/googleSheets';
import { getSheetValues } from '@/lib/sheets';
import { mapInventory, mapOwners } from '@/lib/transform';
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerName = typeof body?.ownerName === 'string' ? body.ownerName.trim() : '';
    if (!ownerName) {
      return NextResponse.json({ error: 'Vermietername fehlt' }, { status: 400 });
    }

    const updates = (body?.updates ?? {}) as Record<string, any>;
    const applyToInventory = body?.applyToInventory !== false;
    const normalizedTarget = normalize(ownerName);

    const ownersSheet = await getSheetValues(OWNERS_SHEET);
    if (ownersSheet.length < 2) {
      return NextResponse.json({ error: 'Keine Vermieter-Daten gefunden.' }, { status: 404 });
    }

    const ownersHeader = ownersSheet[0];
    const ownerEntries = mapOwners(ownersSheet);
    const targetOwner = ownerEntries.find((entry) => normalize(entry.vermieterName) === normalizedTarget);

    if (!targetOwner || !targetOwner.sheetRowIndex) {
      return NextResponse.json({ error: 'Vermieter nicht gefunden.' }, { status: 404 });
    }

    const ownerRowIndex = targetOwner.sheetRowIndex;
    const ownerRow = ownersSheet[ownerRowIndex - 1] ? [...ownersSheet[ownerRowIndex - 1]] : null;
    if (!ownerRow) {
      return NextResponse.json({ error: 'Vermieterzeile konnte nicht gelesen werden.' }, { status: 500 });
    }

    const nextOwnerName = (updates.name ?? updates.vermieterName ?? ownerName).trim() || ownerName;
    const nextCountry = (updates.country ?? targetOwner.land ?? '').trim();
    const nextRegion = (updates.region ?? targetOwner.region ?? '').trim();
    const nextCity = (updates.city ?? targetOwner.stadt ?? '').trim();
    const nextStreet = (updates.street ?? updates.strasse ?? targetOwner.strasse ?? '').trim();
    const nextPostalCode = (updates.postalCode ?? updates.plz ?? targetOwner.plz ?? '').trim();
    const nextPhone = (updates.phone ?? targetOwner.telefon ?? '').trim();
    const nextEmail = (updates.email ?? targetOwner.email ?? '').trim();
    const nextWebsite = (updates.website ?? targetOwner.domain ?? '').trim();
    const nextInternational = (updates.internationalCustomers ?? targetOwner.internationaleKunden ?? '').trim();
    const nextCommission = (updates.commission ?? targetOwner.provision ?? '').trim();
    const nextRanking = (updates.ranking ?? targetOwner.ranking ?? '').trim();
    const nextExperience = (updates.experienceYears ?? targetOwner.erfahrungJahre ?? '').trim();
    const nextNotes = (updates.notes ?? updates.ownerNotes ?? targetOwner.notizen ?? '').trim();
    const timestamp = (updates.lastChangeIso ?? new Date().toISOString().split('T')[0]).split('T')[0];
    const nextAddress = (updates.address ?? updates.adresse ?? '').trim() ||
      [nextStreet, nextPostalCode, nextCity].filter(Boolean).join(', ');

    const assignOwner = (candidates: string[], value: string) => {
      const index = resolveColumnIndex(ownersHeader, candidates);
      if (index !== -1) {
        ownerRow[index] = value;
      }
    };

    assignOwner(['vermieter_name', 'vermieter', 'name', 'partner'], nextOwnerName);
    assignOwner(['land', 'country'], nextCountry);
    assignOwner(['region', 'bundesland', 'staat'], nextRegion);
    assignOwner(['stadt', 'city'], nextCity);
    assignOwner(['strasse', 'straße', 'street', 'stra_e'], nextStreet);
    assignOwner(['plz', 'postal_code', 'postleitzahl', 'zip', 'zip_code'], nextPostalCode);
    assignOwner(['adresse', 'address', 'standort'], nextAddress);
    assignOwner(['telefon', 'phone'], nextPhone);
    assignOwner(['email', 'mail'], nextEmail);
    assignOwner(['domain', 'website', 'url'], nextWebsite);
    assignOwner(['internationale_kunden', 'international', 'intl_kunden'], nextInternational);
    assignOwner(['provision', 'commission'], nextCommission);
    assignOwner(['ranking'], nextRanking);
    assignOwner(['erfahrung_jahre', 'erfahrung', 'experience'], nextExperience);
    assignOwner(['notizen', 'notes', 'kommentar'], nextNotes);
    assignOwner(['letzte_aenderung', 'letzte_änderung', 'last_change', 'last_update'], timestamp);

    await updateRow(
      `${OWNERS_SHEET}!A${ownerRowIndex}:${columnIndexToLetter(ownersHeader.length)}${ownerRowIndex}`,
      ownerRow
    );

    if (applyToInventory) {
      const inventoryMatrix = await getSheetValues(INVENTORY_SHEET);
      if (inventoryMatrix.length > 1) {
        const inventoryHeader = inventoryMatrix[0];
        const inventoryEntries = mapInventory(inventoryMatrix);
        const matchingInventory = inventoryEntries.filter(
          (entry) => normalize(entry.vermieterName) === normalizedTarget
        );

        let geocodeResult: { latitude?: number; longitude?: number } | null = null;
        if (updates.street || updates.city || updates.country || updates.postalCode || updates.region) {
          const geo = await geocodeAddress({
            street: nextStreet || undefined,
            city: nextCity,
            region: nextRegion,
            country: nextCountry,
          });
          if (geo) {
            geocodeResult = geo;
          }
        }

        for (const vehicle of matchingInventory) {
          if (!vehicle.sheetRowIndex) continue;
          const rawRow = inventoryMatrix[vehicle.sheetRowIndex - 1]
            ? [...inventoryMatrix[vehicle.sheetRowIndex - 1]]
            : null;
          if (!rawRow) continue;

          const assignInventory = (candidates: string[], value: string | number | null | undefined) => {
            const index = resolveColumnIndex(inventoryHeader, candidates);
            if (index !== -1 && value != null) {
              rawRow[index] = typeof value === 'number' ? String(value) : value;
            }
          };

          assignInventory(['vermieter_name', 'vermieter', 'partner'], nextOwnerName);
          assignInventory(['land', 'country'], nextCountry);
          assignInventory(['region', 'bundesland', 'staat'], nextRegion);
          assignInventory(['stadt', 'city'], nextCity);
          assignInventory(['strasse', 'straße', 'street', 'stra_e'], nextStreet);
          assignInventory(['plz', 'postal_code', 'postleitzahl', 'zip', 'zip_code'], nextPostalCode);
          assignInventory(['standort', 'adresse', 'address'], nextAddress);
          assignInventory(['letzte_aenderung', 'letzte_änderung', 'last_change', 'last_update'], timestamp);

          if (geocodeResult?.latitude != null) {
            assignInventory(['latitude', 'lat', 'breitengrad'], geocodeResult.latitude);
          }
          if (geocodeResult?.longitude != null) {
            assignInventory(['longitude', 'lng', 'laengengrad', 'längengrad'], geocodeResult.longitude);
          }

          await updateRow(
            `${INVENTORY_SHEET}!A${vehicle.sheetRowIndex}:${columnIndexToLetter(inventoryHeader.length)}${vehicle.sheetRowIndex}`,
            rawRow
          );
        }
      }
    }

    return NextResponse.json({ success: true, ownerName: nextOwnerName });
  } catch (error) {
    console.error('[partners-api-patch] Fehler', error);
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
