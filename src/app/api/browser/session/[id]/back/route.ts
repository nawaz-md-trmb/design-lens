import { NextResponse } from 'next/server';
import { sessionBack } from '@/lib/browser-session';

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const meta = await sessionBack(params.id);
    return NextResponse.json({ ok: true, ...meta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Back failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
