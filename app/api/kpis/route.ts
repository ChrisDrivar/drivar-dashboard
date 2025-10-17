import { NextRequest, NextResponse } from 'next/server';
import { getSheetValues } from '@/lib/sheets';
import {
  buildKpis,
  mapInquiries,
  mapInventory,
  mapMissingInventory,
  mapPendingLeads,
  mapOwners,
} from '@/lib/transform';

const INVENTORY_SHEET = 'inventory';
const INVENTORY_RANGE = process.env.GOOGLE_SHEET_RANGE_INVENTORY;
const INQUIRIES_SHEET = 'inquiries';
const INQUIRIES_RANGE = process.env.GOOGLE_SHEET_RANGE_INQUIRIES;
const OWNERS_SHEET = 'owners';
const OWNERS_RANGE = process.env.GOOGLE_SHEET_RANGE_OWNERS;
const MISSING_INVENTORY_SHEET = 'missing inventory';
const MISSING_INVENTORY_RANGE = process.env.GOOGLE_SHEET_RANGE_MISSING_INVENTORY;
const PIPELINE_SHEET = 'listing_requests';
const PIPELINE_RANGE = process.env.GOOGLE_SHEET_RANGE_LISTING_REQUESTS;

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get('country') ?? undefined;
    const region = request.nextUrl.searchParams.get('region') ?? undefined;
    const city = request.nextUrl.searchParams.get('city') ?? undefined;
    const vehicleType = request.nextUrl.searchParams.get('vehicleType') ?? undefined;
    const manufacturer = request.nextUrl.searchParams.get('manufacturer') ?? undefined;
    const radiusParam = request.nextUrl.searchParams.get('radius');
    const radiusKm = radiusParam && !Number.isNaN(Number(radiusParam)) ? Number(radiusParam) : undefined;
    const customLatParam = request.nextUrl.searchParams.get('customLat');
    const customLngParam = request.nextUrl.searchParams.get('customLng');
    const customLabel = request.nextUrl.searchParams.get('customLabel') ?? undefined;
    const customLat = customLatParam && !Number.isNaN(Number(customLatParam)) ? Number(customLatParam) : undefined;
    const customLng = customLngParam && !Number.isNaN(Number(customLngParam)) ? Number(customLngParam) : undefined;

    const [
      inventorySheet,
      inquiriesSheet,
      ownersSheet,
      missingInventorySheet,
      pendingLeadsSheet,
    ] = await Promise.all([
      getSheetValues(INVENTORY_SHEET, INVENTORY_RANGE),
      getSheetValues(INQUIRIES_SHEET, INQUIRIES_RANGE),
      getSheetValues(OWNERS_SHEET, OWNERS_RANGE),
      getSheetValues(MISSING_INVENTORY_SHEET, MISSING_INVENTORY_RANGE),
      getSheetValues(PIPELINE_SHEET, PIPELINE_RANGE),
    ]);

    const inventory = mapInventory(inventorySheet);
    const inquiries = mapInquiries(inquiriesSheet);
    const owners = mapOwners(ownersSheet);
    const missingInventory = mapMissingInventory(missingInventorySheet);
    const pendingLeads = mapPendingLeads(pendingLeadsSheet);
    const payload = buildKpis(inventory, inquiries, owners, missingInventory, pendingLeads, {
      country,
      region,
      city,
      vehicleType,
      manufacturer,
      radiusKm,
      customLocation:
        customLat != null && customLng != null
          ? { latitude: customLat, longitude: customLng, label: customLabel }
          : undefined,
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[kpi-api] failed to load KPIs', error);
    return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 });
  }
}
