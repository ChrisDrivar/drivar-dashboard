import { resolveCityCoordinates } from '@/lib/geo';

type GeocodeInput = {
  street?: string;
  city: string;
  region?: string;
  country: string;
};

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label: string;
};

const DEFAULT_USER_AGENT = 'drivar-dashboard (contact@drivar.de)';

async function queryNominatim(parts: string[], contactEmail?: string) {
  const query = parts.join(', ');
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('q', query);
  if (contactEmail) {
    url.searchParams.set('email', contactEmail);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': process.env.GEOCODER_USER_AGENT ?? DEFAULT_USER_AGENT,
      'Accept-Language': 'de,en',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding fehlgeschlagen: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const candidate = payload[0];
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: typeof candidate.display_name === 'string' ? candidate.display_name : query,
  } as GeocodeResult;
}

const buildQueryVariants = (street?: string, city?: string, region?: string, country?: string) => {
  const parts = (values: Array<string | undefined>) =>
    values.filter((value): value is string => Boolean(value && value.trim()));

  const cityCountry = parts([city, country]);
  const cityRegionCountry = parts([city, region, country]);
  const queries: string[][] = [];

  if (street) {
    if (cityRegionCountry.length >= 2) queries.push([street, ...cityRegionCountry]);
    if (cityCountry.length >= 2) queries.push([street, ...cityCountry]);
  }
  if (cityRegionCountry.length >= 2) queries.push(cityRegionCountry);
  if (cityCountry.length >= 2) queries.push(cityCountry);

  const seen = new Set<string>();
  return queries.filter((combo) => {
    const key = combo.map((value) => value.toLowerCase()).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function geocodeAddress({ street, city, region, country }: GeocodeInput): Promise<GeocodeResult | null> {
  const variants = buildQueryVariants(street, city, region, country);
  if (variants.length === 0) return null;

  const contactEmail = process.env.GEOCODER_CONTACT_EMAIL;

  for (const variant of variants) {
    const result = await queryNominatim(variant, contactEmail).catch((error) => {
      console.error('[geocode] Fehler bei Query', { variant: variant.join(', ') }, error);
      return null;
    });
    if (result) return result;
  }

  const resolved = resolveCityCoordinates(city ?? '', country ?? '');
  if (resolved) {
    return {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      label: `${city ?? ''}, ${country ?? ''}`.trim(),
    };
  }

  return null;
}
