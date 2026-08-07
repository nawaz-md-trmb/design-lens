import path from 'path';
import { mkdir, readFile, readdir, writeFile } from 'fs/promises';

/** Local report directory — /tmp on Vercel, public/reports locally & on Docker. */
export function getReportDir(reportId: string): string {
  if (process.env.VERCEL === '1') {
    return path.join('/tmp', 'designlens-reports', reportId);
  }
  return path.join(process.cwd(), 'public', 'reports', reportId);
}

export function useBlobStorage(): boolean {
  return process.env.VERCEL === '1' && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Upload all report files to Vercel Blob after compare (serverless-safe persistence). */
export async function persistReportToBlob(reportId: string): Promise<void> {
  if (!useBlobStorage()) return;

  const dir = getReportDir(reportId);
  const { put } = await import('@vercel/blob');
  const files = await readdir(dir);

  await Promise.all(
    files.map(async (file) => {
      const buf = await readFile(path.join(dir, file));
      const contentType = file.endsWith('.json') ? 'application/json' : 'image/png';
      await put(`reports/${reportId}/${file}`, buf, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
    }),
  );
}

export async function readReportJson(reportId: string): Promise<string | null> {
  if (useBlobStorage()) {
    const { list } = await import('@vercel/blob');
    const pathname = `reports/${reportId}/report.json`;
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return await res.text();
  }

  try {
    return await readFile(
      path.join(process.cwd(), 'public', 'reports', reportId, 'report.json'),
      'utf-8',
    );
  } catch {
    return null;
  }
}

export async function readReportAsset(
  reportId: string,
  filePath: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safe = filePath.replace(/\.\./g, '');
  if (!safe) return null;

  if (useBlobStorage()) {
    const { list } = await import('@vercel/blob');
    const pathname = `reports/${reportId}/${safe}`;
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = safe.endsWith('.json') ? 'application/json' : 'image/png';
    return { buffer, contentType };
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), 'public', 'reports', reportId, safe));
    const contentType = safe.endsWith('.json') ? 'application/json' : 'image/png';
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function ensureReportDir(reportId: string): Promise<string> {
  const dir = getReportDir(reportId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeReportJsonFile(reportId: string, data: unknown): Promise<void> {
  const dir = getReportDir(reportId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'report.json'), JSON.stringify(data, null, 2));
}
