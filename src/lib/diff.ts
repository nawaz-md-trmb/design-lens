import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { DiffRegion } from './types';
import { buildRulerAnnotationSvg } from './ruler-annotations';

// ── Public API ─────────────────────────────────────────────

export interface DiffResult {
  mismatchPercentage: number;
  diffPixels: number;
  totalPixels: number;
  dimensions: { width: number; height: number };
  regions: DiffRegion[];
}

export async function compareImages(
  designPath: string,
  actualPath: string,
  diffOutputPath: string,
): Promise<DiffResult> {
  const [designBuf, actualBuf] = await Promise.all([
    readFile(designPath),
    readFile(actualPath),
  ]);

  const actualMeta = await sharp(actualBuf).metadata();
  const targetWidth = actualMeta.width!;
  const targetHeight = actualMeta.height!;

  // Design should already be aligned to viewport dimensions by alignDesignToViewport.
  // Fall back to width-scale + top crop if not pre-aligned.
  const designMeta = await sharp(designBuf).metadata();
  let designResized: Buffer;

  if (designMeta.width === targetWidth && designMeta.height === targetHeight) {
    designResized = await sharp(designBuf).png().toBuffer();
  } else {
    const scaledH = Math.round(designMeta.height! * (targetWidth / designMeta.width!));
    let buf = await sharp(designBuf)
      .resize(targetWidth, scaledH, { fit: 'fill' })
      .png()
      .toBuffer();

    if (scaledH > targetHeight) {
      buf = await sharp(buf)
        .extract({ left: 0, top: 0, width: targetWidth, height: targetHeight })
        .png()
        .toBuffer();
    } else if (scaledH < targetHeight) {
      buf = await sharp(buf)
        .extend({
          top: 0,
          bottom: targetHeight - scaledH,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toBuffer();
    }
    designResized = buf;
  }

  const actualPng = await sharp(actualBuf).png().toBuffer();

  const img1 = PNG.sync.read(designResized);
  const img2 = PNG.sync.read(actualPng);
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const diffPixelCount = pixelmatch(
    new Uint8Array(img1.data.buffer, img1.data.byteOffset, img1.data.byteLength),
    new Uint8Array(img2.data.buffer, img2.data.byteOffset, img2.data.byteLength),
    new Uint8Array(diff.data.buffer, diff.data.byteOffset, diff.data.byteLength),
    width,
    height,
    // Slightly higher threshold reduces noise from font anti-aliasing.
    // includeAA: true treats AA differences as real discrepancies.
    { threshold: 0.15, includeAA: true },
  );

  await writeFile(diffOutputPath, PNG.sync.write(diff));
  await writeFile(designPath, designResized);

  const totalPixels = width * height;
  const mismatchPercentage = +((diffPixelCount / totalPixels) * 100).toFixed(2);
  const regions = detectRegions(img1.data, img2.data, width, height);

  return {
    mismatchPercentage,
    diffPixels: diffPixelCount,
    totalPixels,
    dimensions: { width, height },
    regions,
  };
}

/**
 * Draw numbered annotation boxes onto an image and write to outputPath.
 */
export async function generateAnnotatedImage(
  imagePath: string,
  regions: DiffRegion[],
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const buf = await readFile(imagePath);
  if (regions.length === 0) {
    await writeFile(outputPath, buf);
    return;
  }

  const svg = buildRulerAnnotationSvg(regions, width, height);
  await sharp(buf)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
}

/**
 * Generate tight before/after crop thumbnails for each region and
 * populate cropDesignImage / cropActualImage on each DiffRegion.
 */
export async function generateCropThumbnails(
  designPath: string,
  actualPath: string,
  regions: DiffRegion[],
  reportDir: string,
  slug: string,
): Promise<void> {
  const THUMB_MAX = 320;
  const PAD = 16;

  const [designBuf, actualBuf] = await Promise.all([
    readFile(designPath),
    readFile(actualPath),
  ]);

  const designMeta = await sharp(designBuf).metadata();
  const imgW = designMeta.width!;
  const imgH = designMeta.height!;

  await Promise.all(
    regions.map(async (r) => {
      const left = Math.max(0, r.x - PAD);
      const top = Math.max(0, r.y - PAD);
      const right = Math.min(imgW, r.x + r.width + PAD);
      const bottom = Math.min(imgH, r.y + r.height + PAD);
      const cropW = Math.max(1, right - left);
      const cropH = Math.max(1, bottom - top);

      const designCrop = `crop-${r.id}-design-${slug}.png`;
      const actualCrop = `crop-${r.id}-actual-${slug}.png`;

      await sharp(designBuf)
        .extract({ left, top, width: cropW, height: cropH })
        .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toFile(path.join(reportDir, designCrop));

      await sharp(actualBuf)
        .extract({ left, top, width: cropW, height: cropH })
        .resize(THUMB_MAX, THUMB_MAX, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toFile(path.join(reportDir, actualCrop));

      r.cropDesignImage = designCrop;
      r.cropActualImage = actualCrop;
    }),
  );
}

// ── Connected-component region detection ───────────────────

const CELL = 4;
const DIFF_CHANNEL_THRESHOLD = 28;
const CELL_DIFF_RATIO = 0.12;
const DILATE_RADIUS = 1;
const MIN_REGION_PX = 16;
const MAX_REGION_AREA_RATIO = 0.35;
const MAX_REGIONS = 16;

function detectRegions(
  data1: Buffer,
  data2: Buffer,
  imgW: number,
  imgH: number,
): DiffRegion[] {
  const cols = Math.ceil(imgW / CELL);
  const rows = Math.ceil(imgH / CELL);

  // 1. Build boolean grid
  const grid = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * CELL;
      const y0 = r * CELL;
      const x1 = Math.min(x0 + CELL, imgW);
      const y1 = Math.min(y0 + CELL, imgH);
      let diffCnt = 0;
      let total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * imgW + x) * 4;
          const d =
            Math.abs(data1[i] - data2[i]) +
            Math.abs(data1[i + 1] - data2[i + 1]) +
            Math.abs(data1[i + 2] - data2[i + 2]);
          if (d > DIFF_CHANNEL_THRESHOLD * 3) diffCnt++;
          total++;
        }
      }
      if (diffCnt / total > CELL_DIFF_RATIO) grid[r * cols + c] = 1;
    }
  }

  // 2. Dilate to merge nearby clusters
  const dilated = dilateGrid(grid, cols, rows, DILATE_RADIUS);

  // 3. Flood-fill connected components → bounding boxes
  const visited = new Uint8Array(cols * rows);
  const rawBoxes: BBox[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (dilated[idx] && !visited[idx]) {
        rawBoxes.push(floodFill(dilated, visited, cols, rows, c, r));
      }
    }
  }

  // 4. Convert to pixel coords, filter tiny, merge nearby
  let boxes = rawBoxes
    .map((b) => ({
      x: b.minC * CELL,
      y: b.minR * CELL,
      w: Math.min((b.maxC + 1) * CELL, imgW) - b.minC * CELL,
      h: Math.min((b.maxR + 1) * CELL, imgH) - b.minR * CELL,
    }))
    .filter((b) => b.w >= MIN_REGION_PX && b.h >= MIN_REGION_PX);

  boxes = mergeNearby(boxes, 12);

  // Split oversized regions using a finer grid (avoids one full-screen blob)
  boxes = splitOversizedRegions(data1, data2, imgW, imgH, boxes);

  // 5. Score each box and build final regions
  const regions: DiffRegion[] = boxes
    .map((b, i) => {
      const pct = regionDiffPct(data1, data2, imgW, b);
      return {
        id: i + 1,
        label: positionLabel(b.x, b.y, b.w, b.h, imgW, imgH),
        severity: severity(pct),
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        diffPercentage: pct,
      };
    })
    .filter((r) => r.diffPercentage > 1)
    .sort((a, b) => b.diffPercentage - a.diffPercentage)
    .slice(0, MAX_REGIONS);

  regions.forEach((r, i) => (r.id = i + 1));
  return regions;
}

function splitOversizedRegions(
  data1: Buffer,
  data2: Buffer,
  imgW: number,
  imgH: number,
  boxes: Rect[],
): Rect[] {
  const totalArea = imgW * imgH;
  const out: Rect[] = [];

  for (const box of boxes) {
    const area = box.w * box.h;
    if (area / totalArea <= MAX_REGION_AREA_RATIO) {
      out.push(box);
      continue;
    }

  // Fine-grained pass inside the oversized box
    const fineCell = 3;
    const cols = Math.ceil(box.w / fineCell);
    const rows = Math.ceil(box.h / fineCell);
    const grid = new Uint8Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = box.x + c * fineCell;
        const y0 = box.y + r * fineCell;
        const x1 = Math.min(x0 + fineCell, box.x + box.w);
        const y1 = Math.min(y0 + fineCell, box.y + box.h);
        let diffCnt = 0;
        let total = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * imgW + x) * 4;
            const d =
              Math.abs(data1[i] - data2[i]) +
              Math.abs(data1[i + 1] - data2[i + 1]) +
              Math.abs(data1[i + 2] - data2[i + 2]);
            if (d > DIFF_CHANNEL_THRESHOLD * 3) diffCnt++;
            total++;
          }
        }
        if (diffCnt / total > 0.18) grid[r * cols + c] = 1;
      }
    }

    const visited = new Uint8Array(cols * rows);
    const subBoxes: Rect[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (grid[idx] && !visited[idx]) {
          const b = floodFill(grid, visited, cols, rows, c, r);
          subBoxes.push({
            x: box.x + b.minC * fineCell,
            y: box.y + b.minR * fineCell,
            w: Math.min((b.maxC + 1) * fineCell, box.w) - b.minC * fineCell,
            h: Math.min((b.maxR + 1) * fineCell, box.h) - b.minR * fineCell,
          });
        }
      }
    }

    const valid = subBoxes.filter((b) => b.w >= MIN_REGION_PX && b.h >= MIN_REGION_PX);
    if (valid.length > 0) {
      out.push(...valid);
    } else {
      out.push(box);
    }
  }

  return out;
}

// ── Grid helpers ───────────────────────────────────────────

function dilateGrid(
  src: Uint8Array,
  cols: number,
  rows: number,
  radius: number,
): Uint8Array {
  const out = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!src[r * cols + c]) continue;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            out[nr * cols + nc] = 1;
          }
        }
      }
    }
  }
  return out;
}

interface BBox {
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
}

function floodFill(
  grid: Uint8Array,
  visited: Uint8Array,
  cols: number,
  rows: number,
  startC: number,
  startR: number,
): BBox {
  const queue: number[] = [startC, startR];
  visited[startR * cols + startC] = 1;
  let minC = startC,
    maxC = startC,
    minR = startR,
    maxR = startR;

  while (queue.length > 0) {
    const c = queue.shift()!;
    const r = queue.shift()!;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;

    for (const [dc, dr] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (
        nc >= 0 &&
        nc < cols &&
        nr >= 0 &&
        nr < rows &&
        grid[nr * cols + nc] &&
        !visited[nr * cols + nc]
      ) {
        visited[nr * cols + nc] = 1;
        queue.push(nc, nr);
      }
    }
  }

  return { minC, maxC, minR, maxR };
}

// ── Pixel-rect helpers ─────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectsClose(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y
  );
}

function mergeTwo(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

function mergeNearby(rects: Rect[], gap: number): Rect[] {
  let list = [...rects];
  let changed = true;
  while (changed) {
    changed = false;
    const next: Rect[] = [];
    const used = new Set<number>();
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      let cur = list[i];
      for (let j = i + 1; j < list.length; j++) {
        if (used.has(j)) continue;
        if (rectsClose(cur, list[j], gap)) {
          cur = mergeTwo(cur, list[j]);
          used.add(j);
          changed = true;
        }
      }
      next.push(cur);
    }
    list = next;
  }
  return list;
}

function regionDiffPct(d1: Buffer, d2: Buffer, imgW: number, r: Rect): number {
  let diff = 0;
  let total = 0;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * imgW + x) * 4;
      const d =
        Math.abs(d1[i] - d2[i]) +
        Math.abs(d1[i + 1] - d2[i + 1]) +
        Math.abs(d1[i + 2] - d2[i + 2]);
      if (d > DIFF_CHANNEL_THRESHOLD * 3) diff++;
      total++;
    }
  }
  return total ? +((diff / total) * 100).toFixed(1) : 0;
}

// ── Labelling ──────────────────────────────────────────────

function positionLabel(
  x: number,
  y: number,
  w: number,
  h: number,
  imgW: number,
  imgH: number,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const col =
    cx < imgW * 0.33 ? 'left' : cx > imgW * 0.67 ? 'right' : 'center';
  const row =
    cy < imgH * 0.33 ? 'Top' : cy > imgH * 0.67 ? 'Bottom' : 'Middle';
  if (col === 'center' && row === 'Middle') return 'Center area';
  if (col === 'center') return `${row} area`;
  return `${row}-${col} area`;
}

function severity(pct: number): 'high' | 'medium' | 'low' {
  if (pct > 40) return 'high';
  if (pct > 15) return 'medium';
  return 'low';
}

