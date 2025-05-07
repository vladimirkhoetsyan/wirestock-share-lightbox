import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

// POST /api/lightboxes/[id]/import-csv
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const lightboxId = params.id;
  const csvText = await req.text();

  let records;
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    return NextResponse.json({ imported: 0, errors: ['Invalid CSV format'] }, { status: 400 });
  }

  const errors: string[] = [];
  let imported = 0;

  for (const record of records) {
    // Validate required fields
    if (!record.s3_uri) {
      errors.push(`Missing s3_uri in record: ${JSON.stringify(record)}`);
      continue;
    }
    try {
      await prisma.media_items.create({
        data: {
          lightbox_id: lightboxId,
          s3_uri: record.s3_uri,
          media_type: record.media_type || null,
          duration_seconds: record.duration_seconds ? Number(record.duration_seconds) : null,
          dimensions: record.dimensions || null,
          order: record.order ? Number(record.order) : 0,
        },
      });
      imported++;
    } catch (e) {
      errors.push(`Failed to import record: ${JSON.stringify(record)}`);
    }
  }

  return NextResponse.json({ imported, errors });
} 