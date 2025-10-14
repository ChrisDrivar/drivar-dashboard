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

export async function geocodeAddress({ street, city, region, country }: GeocodeInput): Promise<GeocodeResult | null> {
  const baseParts = [city, region, country].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  if (baseParts.length < 2) {
    return null;
  }

  const contactEmail = process.env.GEOCODER_CONTACT_EMAIL;

  const streetParts: string[] = street ? [street, ...baseParts] : baseParts;

  const fullMatch = await queryNominatim(streetParts, contactEmail).catch((error) => {
    console.error('[geocode] Fehler bei Street-Query', error);
    return null;
  });
  if (fullMatch) {
    return fullMatch;
  }

  const cityMatch = await queryNominatim(baseParts, contactEmail).catch((error) => {
    console.error('[geocode] Fehler bei City-Query', error);
    return null;
  });
  if (cityMatch) {
    return cityMatch;
  }

  const resolved = resolveCityCoordinates(city, country);
  if (resolved) {
    return {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      label: `${city}, ${country}`,
    };
  }

  return null;
}
