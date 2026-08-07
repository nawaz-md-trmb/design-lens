import { NextResponse } from 'next/server';
import { sessionCurrentMeta } from '@/lib/browser-session';

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const meta = await sessionCurrentMeta(params.id);
    return NextResponse.json(meta);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Session not found';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
