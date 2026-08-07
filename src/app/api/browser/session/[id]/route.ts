import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/browser-session';

export const maxDuration = 60;

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await destroySession(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to close session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
