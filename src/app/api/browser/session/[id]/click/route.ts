import { NextResponse } from 'next/server';
import { sessionClick } from '@/lib/browser-session';

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as { x?: number; y?: number };
    if (typeof body.x !== 'number' || typeof body.y !== 'number') {
      return NextResponse.json(
        { error: 'x and y (numbers) are required' },
        { status: 400 },
      );
    }
    const meta = await sessionClick(params.id, body.x, body.y);
    return NextResponse.json({ ok: true, ...meta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Click failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
