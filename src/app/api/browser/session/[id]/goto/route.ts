import { NextResponse } from 'next/server';
import { sessionGoto } from '@/lib/browser-session';
import { normalizeUrl } from '@/lib/utils';

export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    const meta = await sessionGoto(params.id, normalizeUrl(body.url));
    return NextResponse.json({ ok: true, ...meta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Navigation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
