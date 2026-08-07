import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import path from 'path';
import { writeFile } from 'fs/promises';
import type { LayoutZone, LayoutZoneType } from './types';

export type ZoneRect = { x: number; y: number; width: number; height: number };

const ZONE_META: Record<
  LayoutZoneType,
  { label: string; icon: string; checklist: string[] }
> = {
  'side-navigation': {
    label: 'Side navigation',
    icon: '☰',
    checklist: [
      'Menu item labels and order match the design',
      'Icons match design (style, size, spacing)',
      'Active / selected state styling is correct',
      'Background color and width match spec',
      'Collapse/expand behaviour if applicable',
    ],
  },
  'top-header': {
    label: 'Top header / app bar',
    icon: '▬',
    checklist: [
      'Logo and product name placement',
      'Breadcrumbs or page title',
      'Right-side actions (buttons, avatar, notifications)',
      'Header height and background color',
    ],
  },
  'page-toolbar': {
    label: 'Page toolbar',
    icon: '⚙',
    checklist: [
      'Primary actions (buttons) match design',
      'Search/filter controls present and styled correctly',
      'Tab navigation if applicable',
      'Spacing between toolbar items',
    ],
  },
  'main-content': {
    label: 'Main content area',
    icon: '▦',
    checklist: [
      'Table/grid/list layout matches design',
      'Column headers and data alignment',
      'Card/panel spacing and borders',
      'Empty states and loading states',
    ],
  },
  footer: {
    label: 'Footer',
    icon: '▁',
    checklist: ['Footer links and copyright text', 'Footer height and background'],
  },
};

function loadPng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

/** Find strongest vertical edge in the left portion — likely sidebar divider. */
function detectSidebarWidth(data: Buffer, w: number, h: number): number | null {
  const yStart = Math.floor(h * 0.12);
  const yEnd = Math.floor(h * 0.88);
  const searchMin = Math.max(120, Math.floor(w * 0.08));
  const searchMax = Math.floor(w * 0.38);

  let bestX = 0;
  let bestScore = 0;

  for (let x = searchMin; x < searchMax; x++) {
    let score = 0;
    for (let y = yStart; y < yEnd; y++) {
      const i1 = (y * w + x) * 4;
      const i2 = (y * w + x + 1) * 4;
      score +=
        Math.abs(data[i1] - data[i2]) +
        Math.abs(data[i1 + 1] - data[i2 + 1]) +
        Math.abs(data[i1 + 2] - data[i2 + 2]);
    }
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }

  const avgScore = bestScore / (yEnd - yStart);
  if (avgScore < 18) return null;
  return bestX + 1;
}

/** Find horizontal divider below header in the main area. */
function detectHeaderHeight(
  data: Buffer,
  w: number,
  h: number,
  mainX: number,
  mainW: number,
): number | null {
  const searchMax = Math.min(Math.floor(h * 0.2), 160);
  const xStart = mainX + Math.floor(mainW * 0.05);
  const xEnd = mainX + Math.floor(mainW * 0.95);

  let bestY = 0;
  let bestScore = 0;

  for (let y = 40; y < searchMax; y++) {
    let score = 0;
    for (let x = xStart; x < xEnd; x++) {
      const i1 = (y * w + x) * 4;
      const i2 = ((y + 1) * w + x) * 4;
      score +=
        Math.abs(data[i1] - data[i2]) +
        Math.abs(data[i1 + 1] - data[i2 + 1]) +
        Math.abs(data[i1 + 2] - data[i2 + 2]);
    }
    if (score > bestScore) {
      bestScore = score;
      bestY = y;
    }
  }

  const rowCount = xEnd - xStart;
  if (rowCount === 0 || bestScore / rowCount < 15) return null;
  return bestY + 1;
}

function buildZoneMap(
  w: number,
  h: number,
  sidebarW: number | null,
  headerH: number | null,
): { type: LayoutZoneType; rect: ZoneRect }[] {
  const zones: { type: LayoutZoneType; rect: ZoneRect }[] = [];
  const sbW = sidebarW && sidebarW >= 120 && sidebarW <= w * 0.42 ? sidebarW : 0;
  const hdrH = headerH && headerH >= 48 && headerH <= h * 0.22 ? headerH : 0;

  if (sbW > 0) {
    zones.push({
      type: 'side-navigation',
      rect: { x: 0, y: 0, width: sbW, height: h },
    });
  }

  const mainX = sbW;
  const mainW = w - sbW;

  if (hdrH > 0 && mainW > 200) {
    zones.push({
      type: 'top-header',
      rect: { x: mainX, y: 0, width: mainW, height: hdrH },
    });
  }

  const contentY = hdrH > 0 ? hdrH : 0;
  const contentH = h - contentY;

  // Secondary toolbar band — common below header in SaaS UIs
  const toolbarH = hdrH > 0 ? Math.min(72, Math.floor(contentH * 0.1)) : 0;
  if (toolbarH >= 48 && mainW > 300 && contentH > toolbarH + 100) {
    zones.push({
      type: 'page-toolbar',
      rect: { x: mainX, y: contentY, width: mainW, height: toolbarH },
    });
  }

  const mainContentY = contentY + (toolbarH >= 48 ? toolbarH : 0);
  const mainContentH = h - mainContentY;

  if (mainContentH > 80 && mainW > 200) {
    zones.push({
      type: 'main-content',
      rect: { x: mainX, y: mainContentY, width: mainW, height: mainContentH },
    });
  }

  // If no zones detected, treat full screen as main content
  if (zones.length === 0) {
    zones.push({
      type: 'main-content',
      rect: { x: 0, y: 0, width: w, height: h },
    });
  }

  return zones;
}

function compareZone(
  designData: Buffer,
  actualData: Buffer,
  w: number,
  rect: ZoneRect,
): number {
  const diff = new PNG({ width: rect.width, height: rect.height });
  const designCrop = new PNG({ width: rect.width, height: rect.height });
  const actualCrop = new PNG({ width: rect.width, height: rect.height });

  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const srcIdx = ((rect.y + y) * w + (rect.x + x)) * 4;
      const dstIdx = (y * rect.width + x) * 4;
      designCrop.data[dstIdx] = designData[srcIdx];
      designCrop.data[dstIdx + 1] = designData[srcIdx + 1];
      designCrop.data[dstIdx + 2] = designData[srcIdx + 2];
      designCrop.data[dstIdx + 3] = 255;
      actualCrop.data[dstIdx] = actualData[srcIdx];
      actualCrop.data[dstIdx + 1] = actualData[srcIdx + 1];
      actualCrop.data[dstIdx + 2] = actualData[srcIdx + 2];
      actualCrop.data[dstIdx + 3] = 255;
    }
  }

  const diffPixels = pixelmatch(
    designCrop.data,
    actualCrop.data,
    diff.data,
    rect.width,
    rect.height,
    { threshold: 0.12, includeAA: true },
  );

  return +((diffPixels / (rect.width * rect.height)) * 100).toFixed(1);
}

function zoneSeverity(mismatch: number): 'high' | 'medium' | 'low' {
  if (mismatch > 35) return 'high';
  if (mismatch > 15) return 'medium';
  return 'low';
}

function designerNote(type: LayoutZoneType, mismatch: number): string {
  const meta = ZONE_META[type];
  if (mismatch > 50) {
    return `The ${meta.label.toLowerCase()} is structurally different from the design — layout, content, or styling does not match. This is a major visual gap, not a minor pixel drift.`;
  }
  if (mismatch > 25) {
    return `The ${meta.label.toLowerCase()} clearly differs from the design — check items, spacing, colors, and typography against the mockup.`;
  }
  if (mismatch > 12) {
    return `The ${meta.label.toLowerCase()} has noticeable differences — review against the design for styling and alignment issues.`;
  }
  return `The ${meta.label.toLowerCase()} largely matches the design with minor differences.`;
}

function devAction(type: LayoutZoneType, mismatch: number): string {
  const meta = ZONE_META[type];
  const items = meta.checklist.slice(0, 3).join('; ');
  if (mismatch > 35) {
    return `Rebuild the ${meta.label.toLowerCase()} to match the design. Check: ${items}.`;
  }
  return `Review ${meta.label.toLowerCase()} against design spec. Check: ${items}.`;
}

const MISMATCH_THRESHOLD = 10;

export async function analyzeLayoutZones(
  designPath: string,
  actualPath: string,
  reportDir: string,
  slug: string,
): Promise<LayoutZone[]> {
  const [designBuf, actualBuf] = await Promise.all([
    sharp(designPath).ensureAlpha().png().toBuffer(),
    sharp(actualPath).ensureAlpha().png().toBuffer(),
  ]);

  const designPng = loadPng(designBuf);
  const { width: w, height: h } = designPng;

  const sidebarW = detectSidebarWidth(designPng.data, w, h);
  const mainX = sidebarW ?? 0;
  const headerH = detectHeaderHeight(designPng.data, w, h, mainX, w - mainX);

  const zoneDefs = buildZoneMap(w, h, sidebarW, headerH);
  const actualPng = loadPng(actualBuf);

  const zones: LayoutZone[] = [];

  for (let i = 0; i < zoneDefs.length; i++) {
    const { type, rect } = zoneDefs[i];
    const mismatch = compareZone(designPng.data, actualPng.data, w, rect);

    if (mismatch < MISMATCH_THRESHOLD) continue;

    const meta = ZONE_META[type];
    const id = i + 1;
    const designCrop = `zone-${id}-${type}-design-${slug}.png`;
    const actualCrop = `zone-${id}-${type}-actual-${slug}.png`;

    await sharp(designBuf)
      .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
      .png()
      .toFile(path.join(reportDir, designCrop));

    await sharp(actualBuf)
      .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
      .png()
      .toFile(path.join(reportDir, actualCrop));

    zones.push({
      id,
      type,
      label: meta.label,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      mismatchPercentage: mismatch,
      matchPercentage: +(100 - mismatch).toFixed(1),
      severity: zoneSeverity(mismatch),
      designerNote: designerNote(type, mismatch),
      devAction: devAction(type, mismatch),
      checklist: meta.checklist,
      cropDesignImage: designCrop,
      cropActualImage: actualCrop,
    });
  }

  zones.sort((a, b) => b.mismatchPercentage - a.mismatchPercentage);
  zones.forEach((z, idx) => {
    z.id = idx + 1;
  });

  return zones;
}

export function layoutZonesToMapRegions(zones: LayoutZone[]) {
  return zones.map((z) => ({
    id: z.id,
    x: z.x,
    y: z.y,
    width: z.width,
    height: z.height,
  }));
}
