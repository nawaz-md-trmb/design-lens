import { NextResponse } from 'next/server';
import { sessionReload } from '@/lib/browser-session';

export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const meta = await sessionReload(params.id);
    return NextResponse.json({ ok: true, ...meta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
