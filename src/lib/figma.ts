/** Parse a Figma design URL into file key and node id. */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('figma.com')) return null;

    const parts = u.pathname.split('/').filter(Boolean);
    const designIdx = parts.indexOf('design');
    const fileKey = designIdx >= 0 ? parts[designIdx + 1] : parts[1];
    if (!fileKey) return null;

    const nodeParam = u.searchParams.get('node-id');
    if (!nodeParam) return null;

    const nodeId = decodeURIComponent(nodeParam).replace(/-/g, ':');
    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

/** Export a Figma frame as PNG bytes via the Figma REST API. */
export async function fetchFigmaFramePng(figmaUrl: string): Promise<Buffer> {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'Figma not configured. Set FIGMA_ACCESS_TOKEN in environment (Figma → Settings → Personal access tokens).',
    );
  }

  const parsed = parseFigmaUrl(figmaUrl);
  if (!parsed) {
    throw new Error('Invalid Figma URL. Use a link like https://www.figma.com/design/FILE_KEY/Name?node-id=1-2');
  }

  const { fileKey, nodeId } = parsed;
  const imagesRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`,
    { headers: { 'X-Figma-Token': token } },
  );

  if (!imagesRes.ok) {
    const err = await imagesRes.text();
    throw new Error(`Figma API error (${imagesRes.status}): ${err}`);
  }

  const imagesData = (await imagesRes.json()) as { images?: Record<string, string | null> };
  const imageUrl = imagesData.images?.[nodeId];
  if (!imageUrl) {
    throw new Error('Figma did not return an image for this frame. Check the URL and node-id.');
  }

  const pngRes = await fetch(imageUrl);
  if (!pngRes.ok) {
    throw new Error(`Failed to download Figma export (${pngRes.status})`);
  }

  return Buffer.from(await pngRes.arrayBuffer());
}
