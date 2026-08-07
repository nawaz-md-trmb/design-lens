import { NextResponse } from 'next/server';
import { readReportAsset } from '@/lib/report-store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; path: string[] } },
) {
  const filePath = params.path.join('/');
  const asset = await readReportAsset(params.id, filePath);

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.buffer), {
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
