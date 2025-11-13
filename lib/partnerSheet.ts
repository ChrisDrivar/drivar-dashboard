const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

export const inventorySynonyms: Record<string, string[]> = {
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
  listed_at: ['listed_at', 'online_seit', 'onboarded_at'],
};

export const ownerSynonyms: Record<string, string[]> = {
  vermieter_name: ['vermieter', 'partner', 'name'],
  land: ['country'],
  region: ['bundesland', 'staat', 'province'],
  stadt: ['city', 'ort'],
  latitude: ['lat', 'breitengrad'],
  longitude: ['lng', 'laengengrad', 'längengrad'],
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
  letzte_aenderung: ['letzte_aenderung', 'letzte_änderung', 'last_change', 'last_update'],
};

export function buildRow(
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
