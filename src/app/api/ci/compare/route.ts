import { NextResponse } from 'next/server';
import { runComparison } from '@/lib/compare-runner';
import { fetchFigmaFramePng } from '@/lib/figma';
import { VIEWPORTS } from '@/lib/viewports';

export const maxDuration = 180;

type CiBody = {
  previewUrl: string;
  designUrl?: string;
  figmaUrl?: string;
  viewports?: string[];
  minMatchPercent?: number;
  ticketId?: string;
};

function authorize(request: Request): boolean {
  const key = process.env.DESIGNLENS_API_KEY;
  if (!key) return process.env.NODE_ENV === 'development';

  const auth = request.headers.get('authorization') ?? '';
  const headerKey = request.headers.get('x-designlens-key') ?? '';
  if (auth.startsWith('Bearer ') && auth.slice(7) === key) return true;
  if (headerKey === key) return true;
  return false;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized — set DESIGNLENS_API_KEY' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CiBody;
    const previewUrl = body.previewUrl?.trim();
    if (!previewUrl) {
      return NextResponse.json({ error: 'previewUrl is required' }, { status: 400 });
    }

    const minMatchPercent = body.minMatchPercent ?? 85;

    let designBuffer: Buffer;
    let figmaSource: string | undefined;

    if (body.figmaUrl?.trim()) {
      figmaSource = body.figmaUrl.trim();
      designBuffer = await fetchFigmaFramePng(figmaSource);
    } else if (body.designUrl?.trim()) {
      const res = await fetch(body.designUrl.trim());
      if (!res.ok) throw new Error(`Failed to fetch design image (${res.status})`);
      designBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: 'Provide figmaUrl or designUrl for the design reference' },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const { report, passed } = await runComparison(
      {
        designBuffer,
        compareUrl: previewUrl,
        figmaSource,
      },
      { minMatchPercent, origin },
    );

    if (body.ticketId) {
      report.ticketId = body.ticketId;
    }

    const scores = report.results.map((r) => ({
      viewport: r.viewport.slug,
      matchPercent: +(100 - r.mismatchPercentage).toFixed(1),
      issues: r.regions.length,
    }));

    const reportUrl = `${origin}/report/${report.id}`;

    return NextResponse.json(
      {
        passed,
        minMatchPercent,
        reportId: report.id,
        reportUrl,
        scores,
        ticketId: body.ticketId,
        report,
      },
      { status: passed ? 200 : 422 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CI compare failed';
    console.error('CI compare failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'DesignLens CI',
    viewports: VIEWPORTS.map((v) => v.slug),
    usage: {
      method: 'POST',
      headers: { Authorization: 'Bearer <DESIGNLENS_API_KEY>' },
      body: {
        previewUrl: 'https://your-preview.example.com',
        figmaUrl: 'https://www.figma.com/design/...?node-id=1-2',
        minMatchPercent: 85,
        ticketId: 'PROJ-123',
      },
    },
  });
}
