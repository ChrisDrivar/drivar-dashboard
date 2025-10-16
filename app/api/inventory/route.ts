import { NextRequest, NextResponse } from 'next/server';
import { deleteRows } from '@/lib/googleSheets';

const INVENTORY_SHEET = 'inventory';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rowIndex = Number(body?.rowIndex);

    if (!rowIndex || Number.isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Ungültige Zeile' }, { status: 400 });
    }

    await deleteRows(INVENTORY_SHEET, [rowIndex]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[inventory-delete]', error);
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }
}
