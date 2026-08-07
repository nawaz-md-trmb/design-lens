import { NextResponse } from 'next/server';
import { sessionKey } from '@/lib/browser-session';

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as { key?: string; text?: string };
    if (!body.key && !body.text) {
      return NextResponse.json(
        { error: 'key or text is required' },
        { status: 400 },
      );
    }
    await sessionKey(params.id, body.key ?? '', body.text);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Key event failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
