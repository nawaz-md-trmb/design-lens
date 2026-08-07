import { NextResponse } from 'next/server';
import { sessionFramePng } from '@/lib/browser-session';

export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const buf = await sessionFramePng(params.id);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to capture frame';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
