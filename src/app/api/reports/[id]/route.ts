import { NextResponse } from 'next/server';
import { readReportJson } from '@/lib/report-store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const data = await readReportJson(params.id);
  if (!data) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  try {
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'Report data is corrupted' }, { status: 500 });
  }
}
