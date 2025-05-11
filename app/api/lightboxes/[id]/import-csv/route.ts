import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { getSignedS3Url } from '@/lib/s3';

// POST /api/lightboxes/[id]/import-csv
export async function POST(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  const { params } = await contextPromise;
  const lightboxId = params.id;

  // Parse multipart form
  let fileBuffer: Buffer, mapping: any;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    mapping = formData.get('mapping') ? JSON.parse(formData.get('mapping') as string) : {};
    if (!file) return NextResponse.json({ imported: 0, errors: ['No file uploaded'] }, { status: 400 });
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    return NextResponse.json({ imported: 0, errors: ['Failed to parse form data'] }, { status: 400 });
  }

  let records;
  try {
    const csvText = fileBuffer.toString('utf-8');
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (err) {
    return NextResponse.json({ imported: 0, errors: ['Invalid CSV format'] }, { status: 400 });
  }

  const errors: string[] = [];
  const importedItems = [];

  for (const record of records) {
    // Use mapping to get correct fields
    const s3_uri = mapping.url ? record[mapping.url] : record.s3_uri;
    const media_type = mapping.type ? record[mapping.type] : record.media_type;
    // Add more fields as needed
    if (!s3_uri) {
      errors.push(`Missing s3_uri in record: ${JSON.stringify(record)}`);
      continue;
    }
    try {
      const created = await prisma.media_items.create({
        data: {
          lightbox_id: lightboxId,
          s3_uri,
          media_type: media_type || null,
          // Add more fields as needed
        },
      });
      let signedUrl = null;
      try {
        signedUrl = await getSignedS3Url(s3_uri);
      } catch {}
      importedItems.push({ ...created, signedUrl });
    } catch (e) {
      errors.push(`Failed to import record: ${JSON.stringify(record)}`);
    }
  }

  return NextResponse.json(importedItems);
} 