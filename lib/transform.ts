import { differenceInCalendarDays, parseISO } from 'date-fns';
import { normaliseLand, resolveCityCoordinates } from '@/lib/geo';
import type {
  GeoLocationPoint,
  InventoryEntry,
  InquiryEntry,
  KpiPayload,
  ListingRequestEntry,
  MissingInventoryEntry,
  OwnerContact,
  PendingLeadEntry,
} from '@/types/kpis';

type InventoryWithOwner = {
  item: InventoryEntry;
  ownerContact?: OwnerContact;
};

const asNumber = (value: string | undefined): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const parseCoordinate = (raw: string | number | undefined | null): number | undefined => {
  if (raw == null) return undefined;
  const stringValue =
    typeof raw === 'number' && Number.isFinite(raw)
      ? String(raw)
      : String(raw).trim().replace(/,/g, '.');
  if (!stringValue) return undefined;
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveCityWithFallback = (
  city: string,
  landCandidates: Array<string | undefined>
): { latitude: number; longitude: number } | undefined => {
  if (!city) return undefined;
  const seen = new Set<string>();
  for (const candidate of landCandidates) {
    if (!candidate) continue;
    const normalized = normaliseLand(candidate);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const resolved = resolveCityCoordinates(city, candidate);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
};

const toDate = (value: string | Date | number | undefined | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  try {
    const parsed = parseISO(stringValue);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const stripDiacritics = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalize = (value: string) => stripDiacritics(value).trim().toLowerCase();

const normalizeKey = (value: string) =>
  value
    ? stripDiacritics(value).trim().toLowerCase().replace(/^\ufeff/, '').replace(/[^a-z0-9]+/g, '_')
    : '';

const createHeaderLookup = (header: string[]) => {
  const normalized = header.map((key) => normalizeKey(key));

  return (candidates: string[]): number => {
    for (const candidate of candidates) {
      const index = normalized.indexOf(normalizeKey(candidate));
      if (index !== -1) return index;
    }
    return -1;
  };
};

const pick = (
  row: string[],
  finder: (candidates: string[]) => number,
  candidates: string[],
  fallbackIndex?: number
): string => {
  const index = finder(candidates);
  if (index !== -1) {
    return row[index] ?? '';
  }
  if (fallbackIndex != null && fallbackIndex < row.length) {
    return row[fallbackIndex] ?? '';
  }
  return '';
};

export function mapInventory(rows: string[][]): InventoryEntry[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    land: 6,
    region: 5,
    vermieterId: -1,
    vermieterName: 0,
    fahrzeugId: -1,
    fahrzeugLabel: 1,
    fahrzeugtyp: 3,
    stadt: 4,
    status: 7,
    listedAt: -1,
    offboardedAt: -1,
    latitude: -1,
    longitude: -1,
    manufacturer: 2,
    street: -1,
    postalCode: -1,
  };

  return entries
    .map((row, index) => {
      const fahrzeugId = pick(row, findIndex, ['fahrzeug_id', 'id'], fallback.fahrzeugId);
      const fahrzeugLabel =
        pick(row, findIndex, ['fahrzeug_label', 'fahrzeug_name', 'fahrzeug', 'modell'], fallback.fahrzeugLabel) ||
        fahrzeugId ||
        pick(row, findIndex, ['fahrzeugtyp'], fallback.fahrzeugtyp) ||
        `Fahrzeug ${index + 1}`;

      const listedAt = toDate(
        pick(
          row,
          findIndex,
          ['listed_at', 'online_seit', 'onboarded_at', 'letzte_aenderung', 'letzte_änderung'],
          fallback.listedAt
        )
      );
      const offboardedAt = toDate(
        pick(row, findIndex, ['offboarded_at', 'offline_seit'], fallback.offboardedAt)
      );
      const latitudeValue = pick(row, findIndex, ['latitude', 'lat', 'breitengrad'], fallback.latitude);
      const longitudeValue = pick(
        row,
        findIndex,
        ['longitude', 'lng', 'laengengrad', 'längengrad'],
        fallback.longitude
      );
      const manufacturerRaw = pick(
        row,
        findIndex,
        ['hersteller', 'manufacturer', 'marke', 'brand'],
        fallback.manufacturer
      );
      const manufacturer =
        manufacturerRaw && manufacturerRaw.trim()
          ? manufacturerRaw.trim()
          : undefined;
      const streetValue = pick(
        row,
        findIndex,
        ['strasse', 'straße', 'stra_e', 'street', 'straße_hausnummer', 'stra_e_hausnummer'],
        fallback.street
      );
      const postalValue = pick(
        row,
        findIndex,
        ['plz', 'postal_code', 'postleitzahl', 'zip', 'zip_code'],
        fallback.postalCode
      );
      let latitude = parseCoordinate(latitudeValue);
      let longitude = parseCoordinate(longitudeValue);

      const land = (pick(row, findIndex, ['land', 'country'], fallback.land) || '').trim();
      const stadt = (pick(row, findIndex, ['stadt', 'city'], fallback.stadt) || '').trim();
      const standortValue = pick(row, findIndex, ['standort', 'adresse', 'address']);
      const ownerAddressFromInventory = standortValue ? standortValue.trim() : '';

      if ((!Number.isFinite(latitude ?? NaN)) || (!Number.isFinite(longitude ?? NaN))) {
        const resolved = resolveCityWithFallback(stadt, [land, 'de', 'at', 'ch', 'uk', 'us', 'ae', 'au']);
        if (resolved) {
          latitude = resolved.latitude;
          longitude = resolved.longitude;
        }
      }

      return {
        land,
        region:
          (pick(row, findIndex, ['region', 'bundesland', 'staat'], fallback.region) || '').trim(),
        vermieterId:
          pick(row, findIndex, ['vermieter_id', 'partner_id'], fallback.vermieterId) || undefined,
        vermieterName:
          (pick(row, findIndex, ['vermieter_name', 'vermieter', 'partner'], fallback.vermieterName) ||
            `Unbekannter Vermieter ${index + 1}`)
            .trim(),
        sheetRowIndex: index + 2,
        fahrzeugId: fahrzeugId || undefined,
        fahrzeugLabel: fahrzeugLabel.trim(),
        fahrzeugtyp:
          (pick(row, findIndex, ['fahrzeugtyp', 'typ', 'segment'], fallback.fahrzeugtyp) || '').trim(),
        stadt,
        manufacturer: manufacturer ? manufacturer.trim() : undefined,
        listedAt,
        offboardedAt,
        status: (pick(row, findIndex, ['status', 'state'], fallback.status) || '').trim(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        street: streetValue?.trim() || undefined,
        postalCode: postalValue?.trim() || undefined,
        ownerAddress: ownerAddressFromInventory || undefined,
      };
    })
    .filter((entry) => Boolean(entry.fahrzeugLabel));
}

export function mapOwners(rows: string[][]): OwnerContact[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    vermieterId: 0,
    vermieterName: 1,
    land: 2,
    region: 3,
    telefon: 3,
    email: 4,
    domain: 5,
    partnerSince: 6,
    status: 7,
    adresse: 8,
    stadt: 9,
    plz: 10,
    strasse: 11,
    internationaleKunden: 12,
    provision: 13,
    ranking: 14,
    erfahrung: 15,
    notizen: 16,
    letzteAenderung: 17,
  };

  return entries
    .map((row, index) => ({
      vermieterId:
        pick(row, findIndex, ['vermieter_id', 'partner_id'], fallback.vermieterId) || undefined,
      vermieterName:
        pick(row, findIndex, ['vermieter_name', 'name', 'vermieter'], fallback.vermieterName) || '',
      land: pick(row, findIndex, ['land', 'country'], fallback.land),
      region: pick(row, findIndex, ['region', 'bundesland', 'staat', 'province'], fallback.region),
      stadt: pick(row, findIndex, ['stadt', 'city'], fallback.stadt),
      telefon: pick(row, findIndex, ['telefon', 'phone'], fallback.telefon),
      email: pick(row, findIndex, ['email'], fallback.email),
      domain: pick(row, findIndex, ['domain', 'website'], fallback.domain),
      partnerSince: pick(row, findIndex, ['partner_since', 'seit'], fallback.partnerSince),
      status: pick(row, findIndex, ['status'], fallback.status),
      adresse: pick(row, findIndex, ['adresse', 'address', 'standort'], fallback.adresse),
      plz: pick(row, findIndex, ['plz', 'postal_code', 'postleitzahl', 'zip', 'zip_code'], fallback.plz),
      strasse: pick(row, findIndex, ['strasse', 'straße', 'street', 'stra_e'], fallback.strasse),
      internationaleKunden: pick(
        row,
        findIndex,
        ['internationale_kunden', 'international', 'intl_kunden'],
        fallback.internationaleKunden
      ),
      provision: pick(row, findIndex, ['provision', 'commission'], fallback.provision),
      ranking: pick(row, findIndex, ['ranking', 'bewertung'], fallback.ranking),
      erfahrungJahre: pick(
        row,
        findIndex,
        ['erfahrung_jahre', 'erfahrung', 'experience'],
        fallback.erfahrung
      ),
      notizen: pick(row, findIndex, ['notizen', 'notes', 'kommentar'], fallback.notizen),
      letzteAenderung: pick(
        row,
        findIndex,
        ['letzte_aenderung', 'letzte_änderung', 'last_change', 'last_update'],
        fallback.letzteAenderung
      ),
      sheetRowIndex: index + 2,
    }))
    .filter((owner) => owner.vermieterName);
}

export function mapInquiries(rows: string[][]): InquiryEntry[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    fahrzeugId: 0,
    fahrzeugtyp: 2,
    stadt: 2,
    anfragen: -1,
    mieten: -1,
    createdAt: -1,
  };

  return entries
    .map((row) => ({
      fahrzeugId: pick(row, findIndex, ['fahrzeug_id', 'id'], fallback.fahrzeugId) || '',
      fahrzeugtyp: pick(row, findIndex, ['fahrzeugtyp', 'typ', 'segment'], fallback.fahrzeugtyp),
      stadt: pick(row, findIndex, ['stadt', 'city'], fallback.stadt),
      anfragen: asNumber(pick(row, findIndex, ['anfragen', 'requests'], fallback.anfragen)),
      mieten: asNumber(pick(row, findIndex, ['mieten', 'bookings'], fallback.mieten)),
      createdAt: toDate(pick(row, findIndex, ['datum', 'created_at'], fallback.createdAt)),
    }))
    .filter((entry) => entry.fahrzeugtyp || entry.fahrzeugId);
}

export function mapMissingInventory(rows: string[][]): MissingInventoryEntry[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    land: -1,
    region: -1,
    stadt: 0,
    fahrzeugtyp: 1,
    anzahl: 2,
    prio: 3,
    kommentar: 4,
  };

  return entries
    .map((row) => ({
      land: pick(row, findIndex, ['land', 'country'], fallback.land) || 'Deutschland',
      region: pick(row, findIndex, ['region', 'bundesland'], fallback.region) || '',
      stadt: pick(row, findIndex, ['stadt', 'city'], fallback.stadt) || 'Unbekannt',
      fahrzeugtyp:
        pick(row, findIndex, ['fahrzeugtyp', 'typ'], fallback.fahrzeugtyp) || 'Unbekannt',
      anzahl: asNumber(pick(row, findIndex, ['anzahl_fehlend', 'anzahl'], fallback.anzahl)),
      prio: pick(row, findIndex, ['prio', 'priorität', 'priority'], fallback.prio),
      kommentar: pick(row, findIndex, ['kommentar', 'notes'], fallback.kommentar),
    }))
    .filter((entry) => entry.fahrzeugtyp && entry.anzahl > 0);
}

export function mapListingRequests(rows: string[][]): ListingRequestEntry[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    datum: 0,
    kanal: 1,
    region: 2,
    fahrzeugtyp: 3,
    anfragen: 4,
    inserate: 5,
  };

  return entries
    .map((row) => ({
      datum: pick(row, findIndex, ['datum', 'date'], fallback.datum) || undefined,
      kanal: pick(row, findIndex, ['kanal', 'source'], fallback.kanal),
      region: pick(row, findIndex, ['region', 'bundesland'], fallback.region),
      fahrzeugtyp: pick(row, findIndex, ['fahrzeugtyp', 'typ'], fallback.fahrzeugtyp),
      anfragen: asNumber(pick(row, findIndex, ['anfragen_total', 'anfragen'], fallback.anfragen)),
      inserate: asNumber(
        pick(row, findIndex, ['inserate_entstanden', 'inserate'], fallback.inserate)
      ),
    }))
    .filter((entry) => entry.kanal || entry.region || entry.fahrzeugtyp);
}

const CLOSED_LEAD_STATUSES = new Set(['Vertrag unterschrieben', 'Abgelehnt']);

export function mapPendingLeads(rows: string[][]): PendingLeadEntry[] {
  const [header, ...entries] = rows;
  if (!header) return [];
  const findIndex = createHeaderLookup(header);
  const fallback = {
    datum: 0,
    kanal: 1,
    region: 2,
    vermieterName: 3,
    fahrzeugLabel: 4,
    manufacturer: 5,
    fahrzeugtyp: 6,
    stadt: 7,
    land: 8,
    kommentar: 9,
    street: 10,
    postalCode: 11,
    phone: -1,
    email: -1,
    website: -1,
    internationalCustomers: -1,
    commission: -1,
    ranking: -1,
    experienceYears: -1,
    ownerNotes: -1,
    status: 12,
    statusUpdatedAt: 13,
  };

  return entries
    .map((row, index) => ({
      datum: pick(row, findIndex, ['datum', 'date'], fallback.datum),
      kanal: pick(row, findIndex, ['kanal', 'channel', 'quelle'], fallback.kanal),
      region: pick(row, findIndex, ['region', 'bundesland'], fallback.region),
      vermieterName:
        pick(row, findIndex, ['vermieter_name', 'vermieter', 'name'], fallback.vermieterName) ||
        '',
      fahrzeugLabel: pick(row, findIndex, ['fahrzeug_label', 'fahrzeug', 'modell'], fallback.fahrzeugLabel),
      manufacturer: pick(row, findIndex, ['manufacturer', 'marke'], fallback.manufacturer),
      fahrzeugtyp: pick(row, findIndex, ['fahrzeugtyp', 'typ'], fallback.fahrzeugtyp),
      stadt: pick(row, findIndex, ['stadt', 'city'], fallback.stadt),
      land: pick(row, findIndex, ['land', 'country'], fallback.land),
      kommentar: pick(row, findIndex, ['kommentar', 'notes', 'bemerkung'], fallback.kommentar),
      street: pick(row, findIndex, ['strasse', 'street'], fallback.street),
      postalCode: pick(row, findIndex, ['plz', 'postal_code', 'zip'], fallback.postalCode),
      phone: pick(row, findIndex, ['telefon', 'phone'], fallback.phone),
      email: pick(row, findIndex, ['email', 'mail'], fallback.email),
      website: pick(row, findIndex, ['website', 'domain', 'url'], fallback.website),
      internationalCustomers: pick(
        row,
        findIndex,
        ['internationale_kunden', 'international', 'intl_kunden'],
        fallback.internationalCustomers
      ),
      commission: pick(row, findIndex, ['provision', 'commission'], fallback.commission),
      ranking: pick(row, findIndex, ['ranking'], fallback.ranking),
      experienceYears: pick(
        row,
        findIndex,
        ['erfahrung_jahre', 'erfahrung', 'experience_years'],
        fallback.experienceYears
      ),
      ownerNotes: pick(row, findIndex, ['notizen', 'vermieter_notizen'], fallback.ownerNotes),
      status: pick(row, findIndex, ['status'], fallback.status) || 'Angefragt',
      statusUpdatedAt: pick(
        row,
        findIndex,
        ['status_updated_at', 'status_geaendert', 'status_date'],
        fallback.statusUpdatedAt
      ),
      sheetRowIndex: index + 2,
    }))
    .filter((entry) => entry.vermieterName.trim().length > 0)
    .filter((entry) => {
      if (!CLOSED_LEAD_STATUSES.has(entry.status)) {
        return true;
      }

      const referenceDate = entry.statusUpdatedAt || entry.datum;
      if (!referenceDate) return true;
      const parsed = parseISO(referenceDate);
      if (Number.isNaN(parsed.getTime())) return true;
      return differenceInCalendarDays(new Date(), parsed) <= 7;
    });
}

type KpiOptions = {
  country?: string;
  region?: string;
  city?: string;
  vehicleType?: string;
  manufacturer?: string;
  radiusKm?: number;
  customLocation?: { latitude: number; longitude: number; label?: string };
};

type LocationAccumulator = {
  latitude: number;
  longitude: number;
  stadt: string;
  land: string;
  vehicles: number;
  owners: Map<string, { key: string; id?: string; name: string }>;
};

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const h = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
};

const getItemCoordinates = (
  item: InventoryEntry,
  fallbackCountries: string[]
): { latitude: number; longitude: number } | undefined => {
  if (item.latitude != null && item.longitude != null) {
    const latitude = typeof item.latitude === 'number' ? item.latitude : parseCoordinate(item.latitude);
    const longitude = typeof item.longitude === 'number' ? item.longitude : parseCoordinate(item.longitude);
    if (latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  if (item.stadt) {
    return resolveCityWithFallback(item.stadt, [item.land, ...fallbackCountries]);
  }
  return undefined;
};

export function buildKpis(
  inventory: InventoryEntry[],
  inquiries: InquiryEntry[],
  owners: OwnerContact[],
  missingInventory: MissingInventoryEntry[],
  pendingLeads: PendingLeadEntry[],
  options: KpiOptions
): KpiPayload {
  const { country, region, city, vehicleType, manufacturer, radiusKm, customLocation } = options;
  const now = new Date();

  const normaliseValue = (value?: string | null) =>
    value ? stripDiacritics(value).trim().toLowerCase() : '';
  const matches = (source?: string | null, target?: string | null) => {
    if (!target) return true;
    return normaliseValue(source) === normaliseValue(target);
  };

  const normalizedCity = city ? normaliseValue(city) : null;

  const countryFallbackOrder: Array<string | undefined> = [country, 'de', 'at', 'ch', 'uk', 'us', 'ae', 'au'];
  const fallbackCountries = countryFallbackOrder.reduce<string[]>((acc, entry) => {
    if (!entry) return acc;
    const normalized = normaliseLand(entry);
    if (acc.some((existing) => normaliseLand(existing) === normalized)) {
      return acc;
    }
    return [...acc, entry];
  }, []);

  let radiusCenter: { latitude: number; longitude: number } | undefined;
  if (radiusKm && customLocation) {
    radiusCenter = { latitude: customLocation.latitude, longitude: customLocation.longitude };
  }
  if (radiusKm && !radiusCenter && normalizedCity) {
    const candidate = inventory.find((item) => {
      if (!matches(item.stadt, city)) return false;
      if (country && !matches(item.land, country)) return false;
      return Boolean(getItemCoordinates(item, fallbackCountries));
    });

    if (candidate) {
      radiusCenter = getItemCoordinates(candidate, fallbackCountries) ?? undefined;
    }

    if (!radiusCenter) {
      radiusCenter = resolveCityWithFallback(city!, [candidate?.land, ...fallbackCountries]);
    }
  }

  const ownerById = new Map<string, OwnerContact>();
  const ownerByName = new Map<string, OwnerContact>();
  owners.forEach((owner) => {
    if (owner.vermieterId) {
      ownerById.set(owner.vermieterId.trim(), owner);
    }
    const normalizedName = normalize(owner.vermieterName);
    ownerByName.set(normalizedName, owner);
  });

  const resolveOwnerContact = (item: InventoryEntry) => {
    if (item.vermieterId && ownerById.has(item.vermieterId)) {
      return ownerById.get(item.vermieterId);
    }
    const normalizedName = normalize(item.vermieterName);
    return ownerByName.get(normalizedName);
  };

  const inventoryWithContacts: InventoryWithOwner[] = inventory.map((item) => {
    const ownerContact = resolveOwnerContact(item);
    const ownerRegion = ownerContact?.region?.trim();
    const resolvedRegion = ownerRegion && ownerRegion.length ? ownerRegion : item.region?.trim() ?? '';
    return {
      item: { ...item, region: resolvedRegion },
      ownerContact,
    };
  });

  const filteredInventory = inventoryWithContacts.filter(({ item }) => {
    if (!matches(item.land, country)) return false;
    if (!matches(item.region, region)) return false;
    if (!matches(item.fahrzeugtyp, vehicleType)) return false;
    if (!matches(item.manufacturer, manufacturer)) return false;
    if (normalizedCity && (!radiusKm || !radiusCenter)) {
      if (!matches(item.stadt, city)) return false;
    }
    return true;
  });

  const inventoryAfterRadius = radiusKm && radiusCenter
    ? filteredInventory.filter(({ item }) => {
        const coordinates = getItemCoordinates(item, fallbackCountries);
        if (!coordinates) return false;
        const distance = distanceInKm(coordinates, radiusCenter!);
        if (!Number.isFinite(distance)) return false;
        return distance <= radiusKm;
      })
    : filteredInventory;

  const inventoryResolved: InventoryWithOwner[] = inventoryAfterRadius;

  const filteredInquiries = inquiries.filter((item) => {
    if (!matches(item.fahrzeugtyp, vehicleType)) return false;
    if (normalizedCity && (!radiusKm || !radiusCenter)) {
      if (!matches(item.stadt, city)) return false;
    }
    return true;
  });

  const vehiclesByLand = new Map<string, number>();
  const vehiclesByRegion = new Map<string, Map<string, number>>();
  const ownersByLand = new Map<string, Set<string>>();
  const ownerVehicleCounts = new Map<string, number>();
  const locationMap = new Map<string, LocationAccumulator>();

  const onboarding = inventoryResolved
    .map(({ item }) => {
      const listedAtDate =
        item.listedAt instanceof Date
          ? item.listedAt
          : typeof item.listedAt === 'string'
          ? new Date(item.listedAt)
          : null;
      return {
        item,
        listedAtDate: listedAtDate && !Number.isNaN(listedAtDate.getTime()) ? listedAtDate : null,
      };
    })
    .filter(({ listedAtDate }) => {
      if (!listedAtDate) return false;
      const days = differenceInCalendarDays(now, listedAtDate);
      return days >= 0 && days < 31;
    })
    .map(({ item, listedAtDate }) => ({
      fahrzeugId: item.fahrzeugId,
      fahrzeugLabel: item.fahrzeugLabel,
      vermieterName: item.vermieterName,
      land: item.land,
      stadt: item.stadt,
      fahrzeugtyp: item.fahrzeugtyp,
      manufacturer: item.manufacturer,
      ageDays: listedAtDate ? differenceInCalendarDays(now, listedAtDate) : null,
      listedAt: listedAtDate ? listedAtDate.toISOString() : null,
    }))
    .sort((a, b) => (a.ageDays ?? 0) - (b.ageDays ?? 0));

  inventoryResolved.forEach(({ item }) => {
    const landKey = item.land || 'Unbekannt';
    const ownerKey = item.vermieterId ? item.vermieterId.trim() : normalize(item.vermieterName);
    const ownerDisplayName = item.vermieterName?.trim() || 'Unbekannter Vermieter';
    const ownerId = item.vermieterId?.trim();
    const regionKey = item.region || 'Unbekannt';

    vehiclesByLand.set(landKey, (vehiclesByLand.get(landKey) ?? 0) + 1);

    if (!vehiclesByRegion.has(landKey)) {
      vehiclesByRegion.set(landKey, new Map<string, number>());
    }
    const regionMap = vehiclesByRegion.get(landKey)!;
    regionMap.set(regionKey, (regionMap.get(regionKey) ?? 0) + 1);

    const ownersInLand = ownersByLand.get(landKey) ?? new Set<string>();
    ownersInLand.add(ownerKey);
    ownersByLand.set(landKey, ownersInLand);

    ownerVehicleCounts.set(ownerKey, (ownerVehicleCounts.get(ownerKey) ?? 0) + 1);

    if (item.latitude != null && item.longitude != null) {
      const geoKey = `${item.latitude.toFixed(4)}|${item.longitude.toFixed(4)}`;
      const existing = locationMap.get(geoKey) ?? {
        latitude: item.latitude,
        longitude: item.longitude,
        stadt: item.stadt,
        land: item.land,
        vehicles: 0,
        owners: new Map<string, { key: string; id?: string; name: string }>(),
      };
      existing.vehicles += 1;
      if (item.stadt) {
        existing.stadt = item.stadt;
      }
      if (item.land) {
        existing.land = item.land;
      }
      existing.owners.set(ownerKey, {
        key: ownerKey,
        id: ownerId,
        name: ownerDisplayName,
      });
      locationMap.set(geoKey, existing);
    }
  });

  const averageVehiclesPerOwner = [...ownersByLand.entries()].map(([land, ownersSet]) => {
    const vehicleCount = vehiclesByLand.get(land) ?? 0;
    const average = ownersSet.size > 0 ? vehicleCount / ownersSet.size : 0;
    return { land, average: Number(average.toFixed(2)) };
  });

  const inquiriesByVehicleType = new Map<string, { anfragen: number; mieten: number }>();
  filteredInquiries.forEach((item) => {
    const key = item.fahrzeugtyp || 'Unbekannt';
    const existing = inquiriesByVehicleType.get(key) ?? { anfragen: 0, mieten: 0 };
    inquiriesByVehicleType.set(key, {
      anfragen: existing.anfragen + item.anfragen,
      mieten: existing.mieten + item.mieten,
    });
  });

  const uniqueValues = (values: Array<string | undefined | null>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort(
      (a, b) => a.localeCompare(b, 'de')
    );

  const normalisedCountry = country ? normaliseValue(country) : null;
  const countryScopedInventory = normalisedCountry
    ? inventoryWithContacts.filter(({ item }) => normaliseValue(item.land) === normalisedCountry)
    : inventoryWithContacts;
  const normalisedRegion = region ? normaliseValue(region) : null;
  const regionScopedInventory = normalisedRegion
    ? countryScopedInventory.filter(({ item }) => normaliseValue(item.region) === normalisedRegion)
    : countryScopedInventory;

  const meta = {
    availableCountries: uniqueValues(inventory.map((item) => item.land)),
    availableRegions: uniqueValues(countryScopedInventory.map(({ item }) => item.region)),
    availableCities: uniqueValues(regionScopedInventory.map(({ item }) => item.stadt)),
    availableVehicleTypes: uniqueValues(countryScopedInventory.map(({ item }) => item.fahrzeugtyp)),
    availableManufacturers: uniqueValues(countryScopedInventory.map(({ item }) => item.manufacturer)),
    totalInventoryRows: inventory.length,
    filteredInventoryRows: inventoryResolved.length,
    customLocation: customLocation
      ? {
          label: customLocation.label ?? '',
          latitude: customLocation.latitude,
          longitude: customLocation.longitude,
        }
      : null,
  };

  const geoLocations = [...locationMap.values()].map((entry) => {
    const owners = [...entry.owners.values()];
    return {
      latitude: entry.latitude,
      longitude: entry.longitude,
      stadt: entry.stadt,
      land: entry.land,
      vehicles: entry.vehicles,
      owners,
      ownerCount: owners.length,
    };
  });

  const toIsoString = (value: InventoryEntry['listedAt']): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  };

  const inventoryPayload = inventoryResolved.map(({ item, ownerContact }) => {
    return {
      ...item,
      listedAt: toIsoString(item.listedAt),
      offboardedAt: toIsoString(item.offboardedAt),
      ownerPhone: ownerContact?.telefon,
      ownerEmail: ownerContact?.email,
      ownerDomain: ownerContact?.domain,
      ownerAddress: ownerContact?.adresse ?? item.ownerAddress,
      ownerInternationalCustomers: ownerContact?.internationaleKunden,
      ownerCommission: ownerContact?.provision,
      ownerRanking: ownerContact?.ranking,
      ownerExperienceYears: ownerContact?.erfahrungJahre,
      ownerNotes: ownerContact?.notizen,
      ownerLastChange: ownerContact?.letzteAenderung,
      ownerRegion: ownerContact?.region,
      ownerCity: ownerContact?.stadt,
      ownerPostalCode: ownerContact?.plz,
      ownerStreet: ownerContact?.strasse,
      ownerSheetRowIndex: ownerContact?.sheetRowIndex,
    };
  });

  const normalizedInventoryOwners = new Set(
    inventory.map((item) => normalize(item.vermieterName)).filter(Boolean)
  );

  const filteredPendingLeads = pendingLeads
    .map((lead) => ({
      ...lead,
      vermieterName: lead.vermieterName.trim(),
    }))
    .filter((lead) => {
      const normalized = normalize(lead.vermieterName);
      if (!normalized) return false;
      const isClosed = CLOSED_LEAD_STATUSES.has(lead.status ?? '');
      if (!isClosed) {
        if (ownerByName.has(normalized)) return false;
        if (normalizedInventoryOwners.has(normalized)) return false;
      }
      return true;
    })
    .filter((lead) => {
      if (!CLOSED_LEAD_STATUSES.has(lead.status ?? '')) {
        return true;
      }
      const referenceDate = lead.statusUpdatedAt || lead.datum;
      if (!referenceDate) return true;
      const parsed = parseISO(referenceDate);
      if (Number.isNaN(parsed.getTime())) return true;
      return differenceInCalendarDays(now, parsed) <= 7;
    })
    .sort((a, b) => {
      if (a.datum && b.datum) {
        return b.datum.localeCompare(a.datum);
      }
      if (a.datum) return -1;
      if (b.datum) return 1;
      return a.vermieterName.localeCompare(b.vermieterName, 'de');
    });

  const kpiPayload: KpiPayload = {
    totals: {
      vehicles: inventoryAfterRadius.length,
      owners: ownerVehicleCounts.size,
      inquiries: filteredInquiries.reduce((sum, item) => sum + item.anfragen, 0),
      rentals: filteredInquiries.reduce((sum, item) => sum + item.mieten, 0),
    },
    byCountry: {
      vehicles: Object.fromEntries(vehiclesByLand),
      owners: Object.fromEntries(
        [...ownersByLand.entries()].map(([land, ownersSet]) => [land, ownersSet.size])
      ),
      averageVehiclesPerOwner,
      vehiclesByRegion: Object.fromEntries(
        [...vehiclesByRegion.entries()].map(([land, regionMap]) => [
          land,
          Object.fromEntries(regionMap),
        ])
      ),
    },
    deltas: {
      vehicles: 0,
      owners: 0,
    },
    onboarding,
    inquiries: {
      byVehicleType: Object.fromEntries(inquiriesByVehicleType),
    },
    inventory: inventoryPayload,
    geo: {
      locations: geoLocations,
    },
    missingInventory,
    pendingLeads: filteredPendingLeads,
    meta,
  };

  return kpiPayload;
}
