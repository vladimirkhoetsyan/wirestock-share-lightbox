import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { getSignedS3Url } from '@/lib/s3';

const importProgress: Record<string, { total: number; processed: number; errors: number }> = {};

// POST /api/lightboxes/[id]/import-csv
export async function POST(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  const { params } = await contextPromise;
  const lightboxId = params.id;

  // Parse multipart form
  let fileBuffer: Buffer, mapping: any, progressId: string | undefined;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    mapping = formData.get('mapping') ? JSON.parse(formData.get('mapping') as string) : {};
    progressId = formData.get('progressId') as string | undefined;
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
  const total = records.length;
  if (progressId) {
    importProgress[progressId] = { total, processed: 0, errors: 0 };
  }

  for (const record of records) {
    // Use mapping to get correct fields
    const s3_uri = mapping.url ? record[mapping.url] : record.s3_uri;
    const media_type = mapping.type ? record[mapping.type] : record.media_type;
    // Add more fields as needed
    if (!s3_uri) {
      errors.push(`Missing s3_uri in record: ${JSON.stringify(record)}`);
      if (progressId) importProgress[progressId].errors++;
      if (progressId) importProgress[progressId].processed++;
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
      if (progressId) importProgress[progressId].errors++;
    }
    if (progressId) importProgress[progressId].processed++;
  }

  if (progressId) {
    // Clean up progress after a short delay
    setTimeout(() => { delete importProgress[progressId!]; }, 60000);
  }

  return NextResponse.json(importedItems);
}

// Add a GET endpoint for progress polling
export async function GET(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  const url = new URL(req.url);
  const progressId = url.searchParams.get('progressId');
  if (!progressId || !importProgress[progressId]) {
    return NextResponse.json({ total: 0, processed: 0, errors: 0 }, { status: 404 });
  }
  return NextResponse.json(importProgress[progressId]);
} 