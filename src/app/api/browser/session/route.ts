import { NextResponse } from 'next/server';
import { createBrowserSession } from '@/lib/browser-session';
import { normalizeUrl } from '@/lib/utils';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    const url = normalizeUrl(body.url);
    const { id, width, height } = await createBrowserSession(url);
    return NextResponse.json({ sessionId: id, width, height });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to start browser session';
    console.error('createBrowserSession:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
