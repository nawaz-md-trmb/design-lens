import sharp from 'sharp';
import type { DiffRegion } from './types';

export type FixCategory =
  | 'color'
  | 'spacing'
  | 'size'
  | 'position'
  | 'layout'
  | 'typography';

export interface FixSuggestion {
  category: FixCategory;
  title: string;
  detail: string;
  /** Copy-pasteable hint for devs */
  action: string;
  priority: 'high' | 'medium' | 'low';
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function contentBounds(
  data: Buffer,
  w: number,
  h: number,
  threshold = 248,
): { x: number; y: number; w: number; h: number } | null {
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < threshold) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function meanRgb(data: Buffer): { r: number; g: number; b: number } {
  let r = 0,
    g = 0,
    b = 0;
  const px = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return { r: r / px, g: g / px, b: b / px };
}

export async function analyzeRegionFixes(
  designPath: string,
  actualPath: string,
  region: Pick<DiffRegion, 'x' | 'y' | 'width' | 'height' | 'diffPercentage'>,
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  const [designCrop, actualCrop] = await Promise.all([
    sharp(designPath)
      .extract({
        left: region.x,
        top: region.y,
        width: Math.min(region.width, 2000),
        height: Math.min(region.height, 2000),
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(actualPath)
      .extract({
        left: region.x,
        top: region.y,
        width: Math.min(region.width, 2000),
        height: Math.min(region.height, 2000),
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);

  const dw = designCrop.info.width;
  const dh = designCrop.info.height;
  const dMean = meanRgb(designCrop.data);
  const aMean = meanRgb(actualCrop.data);

  const colorDelta =
    Math.abs(dMean.r - aMean.r) +
    Math.abs(dMean.g - aMean.g) +
    Math.abs(dMean.b - aMean.b);

  if (colorDelta > 24) {
    const from = rgbToHex(dMean.r, dMean.g, dMean.b);
    const to = rgbToHex(aMean.r, aMean.g, aMean.b);
    suggestions.push({
      category: 'color',
      title: 'Background or fill color mismatch',
      detail: `Design uses ${from} but the build renders closer to ${to} in this area.`,
      action: `Update color to ${from} (design spec). Current build reads as ${to}.`,
      priority: colorDelta > 60 ? 'high' : 'medium',
    });
  }

  const dBox = contentBounds(designCrop.data, dw, dh);
  const aBox = contentBounds(actualCrop.data, dw, dh);

  if (dBox && aBox) {
    const dx = aBox.x - dBox.x;
    const dy = aBox.y - dBox.y;
    if (Math.abs(dx) >= 3 || Math.abs(dy) >= 3) {
      suggestions.push({
        category: 'position',
        title: 'Element position offset',
        detail: `In this snapshot, content is shifted by ${dx}px horizontally and ${dy}px vertically vs the design.`,
        action:
          dx !== 0 && dy !== 0
            ? `Move element ${dx > 0 ? 'right' : 'left'} ${Math.abs(dx)}px and ${dy > 0 ? 'down' : 'up'} ${Math.abs(dy)}px to match design.`
            : dx !== 0
              ? `Move element ${dx > 0 ? 'right' : 'left'} ${Math.abs(dx)}px to match design.`
              : `Move element ${dy > 0 ? 'down' : 'up'} ${Math.abs(dy)}px to match design.`,
        priority: Math.abs(dx) > 8 || Math.abs(dy) > 8 ? 'high' : 'medium',
      });
    }

    const dwDiff = aBox.w - dBox.w;
    const dhDiff = aBox.h - dBox.h;
    if (Math.abs(dwDiff) >= 4 || Math.abs(dhDiff) >= 4) {
      const larger =
        Math.abs(dwDiff) >= Math.abs(dhDiff)
          ? dwDiff > 0
            ? 'wider'
            : 'narrower'
          : dhDiff > 0
            ? 'taller'
            : 'shorter';
      suggestions.push({
        category: 'size',
        title: 'Size differs from design',
        detail: `In this snapshot the built element appears ${larger} than the design (design ~${dBox.w}×${dBox.h}px visible area vs build ~${aBox.w}×${aBox.h}px).`,
        action:
          'Check padding, min-width, flex basis, grid track sizing, and font-size tokens — responsive layouts may need container or breakpoint rules, not fixed px from the mockup.',
        priority: Math.abs(dwDiff) > 12 || Math.abs(dhDiff) > 12 ? 'high' : 'medium',
      });
    }
  }

  if (region.diffPercentage > 25 && region.width * region.height > 40000) {
    suggestions.push({
      category: 'layout',
      title: 'Layout structure differs',
      detail:
        'Multiple components in this section differ from the design — spacing, alignment, or missing blocks are likely.',
      action:
        'Compare spacing (padding/margin/gap), alignment (flex/grid), and verify all design components are present.',
      priority: 'high',
    });
  } else if (region.diffPercentage > 12 && suggestions.length === 0) {
    suggestions.push({
      category: 'typography',
      title: 'Text or fine-detail mismatch',
      detail:
        'Differences are likely font rendering, font-weight, line-height, or 1–2px border/shadow drift.',
      action:
        'Check font-family, font-size, font-weight, line-height, letter-spacing, and border-radius against the design spec.',
      priority: 'medium',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      category: 'spacing',
      title: 'Minor visual drift',
      detail: `${region.diffPercentage}% of pixels differ — often sub-pixel anti-aliasing or compression.`,
      action:
        'Inspect padding, margin, and gap values. Use browser devtools to compare computed styles with design tokens.',
      priority: 'low',
    });
  }

  return suggestions.slice(0, 4);
}
