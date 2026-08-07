import { NextResponse } from 'next/server';
import { getSession, sessionCurrentMeta } from '@/lib/browser-session';
import { runComparison } from '@/lib/compare-runner';

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const designFile = formData.get('designImage') as File | null;
    const sessionId = (formData.get('sessionId') as string | null)?.trim() || null;
    const urlField = (formData.get('url') as string | null)?.trim() || null;
    const figmaSource = (formData.get('figmaSource') as string | null)?.trim() || undefined;

    if (!designFile) {
      return NextResponse.json(
        { error: 'Missing required field: designImage' },
        { status: 400 },
      );
    }

    let compareUrl = urlField;

    if (sessionId) {
      if (!getSession(sessionId)) {
        return NextResponse.json(
          { error: 'Browser session expired — go back and reopen the preview before comparing.' },
          { status: 400 },
        );
      }
      const meta = await sessionCurrentMeta(sessionId);
      compareUrl = meta.url;
    } else if (!compareUrl) {
      return NextResponse.json({ error: 'Missing url or sessionId' }, { status: 400 });
    }

    const { report } = await runComparison({
      designBuffer: Buffer.from(await designFile.arrayBuffer()),
      compareUrl: compareUrl!,
      sessionId,
      figmaSource,
    });

    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Comparison failed';
    console.error('Comparison failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
