import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { getSignedS3Url } from '@/lib/s3';
import { getMediaUrlsFromS3Uri } from '@/lib/media-urls';

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

  // Before the loop, get the current max order
  const maxOrderObj = await prisma.media_items.aggregate({
    where: { lightbox_id: lightboxId },
    _max: { order: true },
  });
  let nextOrder = (maxOrderObj._max.order ?? 0) + 1;

  for (const record of records) {
    // Use mapping to get correct fields
    const s3_uri = mapping.url ? record[mapping.url] : record.s3_uri;
    let media_type = mapping.type ? record[mapping.type] : record.media_type;

    // Detect media_type if not present
    if (!media_type && s3_uri) {
      const ext = s3_uri.split('.').pop()?.toLowerCase();
      const videoExts = ["mp4", "mov", "webm", "m4v", "avi", "mkv", "ogv", "3gp", "3g2", "hls", "m3u8"];
      media_type = videoExts.includes(ext) ? "video" : "image";
    }
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
          order: nextOrder++,
          // Add more fields as needed
        },
      });
      let urls = null;
      try {
        urls = await getMediaUrlsFromS3Uri(s3_uri);
      } catch {}
      importedItems.push({
        ...created,
        originalUrl: urls?.original || '',
        thumbnailUrl: urls?.thumbnail || '',
        previewUrl: urls?.preview || '',
      });
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