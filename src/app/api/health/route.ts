import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = { app: 'ok' };

  if (process.env.REDIS_URL) {
    try {
      // Dynamically import to avoid webpack bundling BullMQ into the health chunk
      const { Queue } = await import('bullmq');
      const q = new Queue('_health_ping', {
        connection: { url: process.env.REDIS_URL },
      });
      await q.getJobCounts();
      await q.close();
      checks.redis = 'ok';
    } catch (err) {
      checks.redis = err instanceof Error ? err.message : 'unreachable';
    }
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor(process.uptime()),
    },
    { status: healthy ? 200 : 503 },
  );
}
