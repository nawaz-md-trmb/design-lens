import { NextResponse } from 'next/server';
import { fetchFigmaFramePng } from '@/lib/figma';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { figmaUrl } = (await request.json()) as { figmaUrl?: string };
    if (!figmaUrl?.trim()) {
      return NextResponse.json({ error: 'figmaUrl is required' }, { status: 400 });
    }

    const buffer = await fetchFigmaFramePng(figmaUrl.trim());

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'X-Figma-Source': figmaUrl.trim(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load Figma frame';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
