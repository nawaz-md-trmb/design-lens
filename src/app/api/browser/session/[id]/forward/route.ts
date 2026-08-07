import { NextResponse } from 'next/server';
import { sessionForward } from '@/lib/browser-session';

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const meta = await sessionForward(params.id);
    return NextResponse.json({ ok: true, ...meta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Forward failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
