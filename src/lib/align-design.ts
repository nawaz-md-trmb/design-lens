import sharp from 'sharp';
import { writeFile } from 'fs/promises';

export type DesignDimensions = {
  width: number;
  height: number;
};

export async function readDesignDimensions(buffer: Buffer): Promise<DesignDimensions> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Could not read design image dimensions');
  }
  return { width: meta.width, height: meta.height };
}

export type DesignAlignment = {
  originalWidth: number;
  originalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  /** How the design was scaled to match the viewport */
  method: 'exact' | 'width-scale' | 'retina-2x';
  warnings: string[];
};

/**
 * Scale a design mockup to align with a captured viewport screenshot.
 *
 * Web designs should be compared by matching viewport WIDTH, then cropping or
 * padding vertically. Using `fit: contain` letterboxes the design and causes
 * pixel coordinates to point at unrelated content in crops.
 */
export async function alignDesignToViewport(
  designPath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<DesignAlignment> {
  const meta = await sharp(designPath).metadata();
  const ow = meta.width!;
  const oh = meta.height!;
  const warnings: string[] = [];

  let scale: number;
  let method: DesignAlignment['method'];

  const widthRatio = ow / targetWidth;

  if (Math.abs(ow - targetWidth) < 4 && Math.abs(oh - targetHeight) < 4) {
    scale = 1;
    method = 'exact';
  } else if (widthRatio > 1.75 && widthRatio < 2.25) {
    scale = 0.5;
    method = 'retina-2x';
    warnings.push(
      `Design appears to be a 2× export (${ow}×${oh}). Scaled to ${targetWidth}×${Math.round(oh * scale)} for comparison.`,
    );
  } else {
    scale = targetWidth / ow;
    method = 'width-scale';
    if (Math.abs(widthRatio - 1) > 0.1) {
      warnings.push(
        `Design is ${ow}×${oh} but the screenshot is ${targetWidth}×${targetHeight}. Scaled to viewport width for alignment — export at exact viewport size for pixel-perfect comparison.`,
      );
    }
  }

  const scaledW = Math.round(ow * scale);
  const scaledH = Math.round(oh * scale);

  let aligned = await sharp(designPath)
    .resize(scaledW, scaledH, { fit: 'fill' })
    .png()
    .toBuffer();

  if (scaledH > targetHeight) {
    const cropped = targetHeight / scaledH;
    if (cropped < 0.95) {
      warnings.push(
        `Design is taller than the viewport — comparing the top ${targetHeight}px only. Scroll position may differ from your mockup.`,
      );
    }
    aligned = await sharp(aligned)
      .extract({ left: 0, top: 0, width: scaledW, height: targetHeight })
      .png()
      .toBuffer();
  } else if (scaledH < targetHeight) {
    warnings.push(
      `Design is shorter than the viewport — bottom area padded with white. The live page may have more content below.`,
    );
    aligned = await sharp(aligned)
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

  if (scaledW !== targetWidth) {
    aligned = await sharp(aligned)
      .resize(targetWidth, targetHeight, { fit: 'fill' })
      .png()
      .toBuffer();
  }

  await writeFile(designPath, aligned);

  return {
    originalWidth: ow,
    originalHeight: oh,
    viewportWidth: targetWidth,
    viewportHeight: targetHeight,
    scale,
    method,
    warnings,
  };
}
