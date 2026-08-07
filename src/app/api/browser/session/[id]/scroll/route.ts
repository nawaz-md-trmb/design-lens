import { NextResponse } from 'next/server';
import { sessionScroll } from '@/lib/browser-session';

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as {
      x?: number;
      y?: number;
      deltaX?: number;
      deltaY?: number;
    };
    const x = typeof body.x === 'number' ? body.x : 640;
    const y = typeof body.y === 'number' ? body.y : 400;
    const deltaX = typeof body.deltaX === 'number' ? body.deltaX : 0;
    const deltaY = typeof body.deltaY === 'number' ? body.deltaY : 0;
    await sessionScroll(params.id, x, y, deltaX, deltaY);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scroll failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
