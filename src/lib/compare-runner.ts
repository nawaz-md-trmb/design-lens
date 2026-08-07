import path from 'path';
import { writeFile, copyFile } from 'fs/promises';
import crypto from 'crypto';
import { captureScreenshot } from '@/lib/capture';
import {
  getSession,
  sessionCurrentMeta,
  sessionScreenshotToFile,
  destroySession,
} from '@/lib/browser-session';
import { compareImages, generateAnnotatedImage, generateCropThumbnails } from '@/lib/diff';
import { readDesignDimensions } from '@/lib/align-design';
import { analyzeLayoutZones } from '@/lib/layout-zones';
import { analyzeRegionFixes } from '@/lib/fix-suggestions';
import { viewportFromDesign } from '@/lib/viewports';
import {
  ensureReportDir,
  persistReportToBlob,
  writeReportJsonFile,
} from '@/lib/report-store';
import type { Report, ViewportResult, DiffRegion } from '@/lib/types';

export type CompareInput = {
  designBuffer: Buffer;
  compareUrl: string;
  sessionId?: string | null;
  figmaSource?: string;
};

export type CompareResult = {
  report: Report;
  reportDir: string;
  minMatchPercent: number;
  passed: boolean;
};

export async function runComparison(
  input: CompareInput,
  options?: { minMatchPercent?: number; origin?: string },
): Promise<CompareResult> {
  const { designBuffer, compareUrl, sessionId, figmaSource } = input;
  const minMatchPercent = options?.minMatchPercent ?? 0;

  const designDimensions = await readDesignDimensions(designBuffer);
  const viewport = viewportFromDesign(designDimensions.width, designDimensions.height);
  const slug = viewport.slug;

  const reportId = crypto.randomUUID();
  const reportsDir = await ensureReportDir(reportId);

  const designOriginalPath = path.join(reportsDir, 'design-original.png');
  await writeFile(designOriginalPath, designBuffer);

  let results: ViewportResult[] = [];

  try {
    const designPath = path.join(reportsDir, `design-${slug}.png`);
    const actualPath = path.join(reportsDir, `actual-${slug}.png`);
    const diffPath = path.join(reportsDir, `diff-${slug}.png`);
    const annotatedPath = path.join(reportsDir, `annotated-${slug}.png`);

    await copyFile(designOriginalPath, designPath);

    // Capture the build at the exact same dimensions as the uploaded design.
    if (sessionId && getSession(sessionId)) {
      await sessionScreenshotToFile(
        sessionId,
        viewport.width,
        viewport.height,
        actualPath,
      );
    } else {
      await captureScreenshot(compareUrl, viewport, actualPath);
    }

    const diffResult = await compareImages(designPath, actualPath, diffPath);

    const layoutZones = await analyzeLayoutZones(designPath, actualPath, reportsDir, slug);

    const zoneRegions: DiffRegion[] = layoutZones.map((z) => ({
      id: z.id,
      label: z.label,
      severity: z.severity,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      diffPercentage: z.mismatchPercentage,
      cropDesignImage: z.cropDesignImage,
      cropActualImage: z.cropActualImage,
      componentType: z.type,
      designerNote: z.designerNote,
      checklist: z.checklist,
      issueKind: 'component' as const,
      fixes: [
        {
          category: 'layout',
          title: `${z.label} doesn't match design`,
          detail: z.designerNote,
          action: z.devAction,
          priority: z.severity === 'high' ? 'high' : z.severity === 'medium' ? 'medium' : 'low',
        },
      ],
    }));

    // All pixel-level clusters — shown alongside component issues
    const detailRegions: DiffRegion[] = diffResult.regions
      .filter((r) => r.diffPercentage > 1)
      .map((r, i) => {
        const parent = findContainingZone(r, layoutZones);
        return {
          ...r,
          id: zoneRegions.length + i + 1,
          label: parent
            ? `Additional difference in ${parent.label}`
            : r.label || 'Additional visual difference',
          issueKind: 'detail' as const,
          withinComponent: parent?.label,
        };
      });

    const regions: DiffRegion[] = [...zoneRegions, ...detailRegions];

    await generateAnnotatedImage(
      actualPath,
      regions,
      diffResult.dimensions.width,
      diffResult.dimensions.height,
      annotatedPath,
    );

    await generateCropThumbnails(designPath, actualPath, regions, reportsDir, slug);

    for (const region of regions) {
      if (!region.fixes?.length) {
        region.fixes = await analyzeRegionFixes(designPath, actualPath, region);
      }
    }

    results = [
      {
        viewport,
        designImage: `design-${slug}.png`,
        actualImage: `actual-${slug}.png`,
        diffImage: `diff-${slug}.png`,
        annotatedImage: `annotated-${slug}.png`,
        designAlignment: {
          originalWidth: designDimensions.width,
          originalHeight: designDimensions.height,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          scale: 1,
          method: 'exact',
          warnings: [],
        },
        layoutZones,
        detailRegions,
        ...diffResult,
        regions,
      },
    ];
  } finally {
    if (sessionId) {
      await destroySession(sessionId).catch(() => {});
    }
  }

  const report: Report = {
    id: reportId,
    url: compareUrl,
    createdAt: new Date().toISOString(),
    figmaSource,
    results,
  };

  await writeReportJsonFile(reportId, report);
  await persistReportToBlob(reportId);

  const worstMatch = Math.min(...results.map((r) => 100 - r.mismatchPercentage));
  const passed = worstMatch >= minMatchPercent;

  return { report, reportDir: reportsDir, minMatchPercent, passed };
}

function findContainingZone(
  region: { x: number; y: number; width: number; height: number },
  zones: { x: number; y: number; width: number; height: number; label: string }[],
) {
  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  return zones.find(
    (z) => cx >= z.x && cx < z.x + z.width && cy >= z.y && cy < z.y + z.height,
  );
}
