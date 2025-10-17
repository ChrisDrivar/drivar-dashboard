import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const country = typeof body?.country === 'string' ? body.country.trim() : '';
    const city = typeof body?.city === 'string' ? body.city.trim() : '';
    const postalCode = typeof body?.postalCode === 'string' ? body.postalCode.trim() : '';
    const region = typeof body?.region === 'string' ? body.region.trim() : '';

    if (!country || !city) {
      return NextResponse.json(
        { error: 'Bitte Land und Stadt angeben.' },
        { status: 400 }
      );
    }

    const geocode = await geocodeAddress({
      street: postalCode || undefined,
      city,
      region,
      country,
    });

    if (!geocode) {
      return NextResponse.json(
        { error: 'Ort wurde nicht gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: geocode.latitude,
      longitude: geocode.longitude,
      label: geocode.label,
      city,
      postalCode,
      country,
      region,
    });
  } catch (error) {
    console.error('[geocode-api] Fehler', error);
    return NextResponse.json({ error: 'Geocoding fehlgeschlagen' }, { status: 500 });
  }
}
