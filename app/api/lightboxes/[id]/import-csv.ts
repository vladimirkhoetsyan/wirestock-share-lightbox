import { NextRequest, NextResponse } from 'next/server';

// POST /api/lightboxes/[id]/import-csv
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Parse CSV, import media items
  return NextResponse.json({
    imported: 10,
    errors: [],
  });
} 