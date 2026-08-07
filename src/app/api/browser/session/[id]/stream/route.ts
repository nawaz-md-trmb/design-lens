import { sessionFramePng, getSession } from '@/lib/browser-session';

export const maxDuration = 300;

const FRAME_INTERVAL_MS = 66; // ~15 fps

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  if (!getSession(id)) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  (async () => {
    try {
      while (!abortController.signal.aborted) {
        if (!getSession(id)) break;
        try {
          const buf = await sessionFramePng(id);
          const b64 = buf.toString('base64');
          const line = `data: ${b64}\n\n`;
          await writer.write(encoder.encode(line));
        } catch {
          // session may be mid-navigation — skip this frame
        }
        // Pace frames
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, FRAME_INTERVAL_MS);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(t);
            resolve();
          });
        });
      }
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
