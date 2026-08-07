import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const reportPath = path.join(
    process.cwd(),
    'public',
    'reports',
    params.id,
    'report.json',
  );
  try {
    const data = await readFile(reportPath, 'utf-8');
    try {
      return NextResponse.json(JSON.parse(data));
    } catch {
      return NextResponse.json(
        { error: 'Report data is corrupted' },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}
