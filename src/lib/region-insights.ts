import type { DiffRegion } from './types';

export type RegionInsight = {
  title: string;
  location: string;
  sizeNote: string;
  differenceNote: string;
  severityLabel: string;
  severityHint: string;
  coveragePercent: number;
};

export type ReportInsight = {
  matchLabel: string;
  matchHint: string;
  summary: string;
  issueCountLabel: string;
};

function regionCoverage(
  region: DiffRegion,
  dims: { width: number; height: number },
): number {
  const regionArea = region.width * region.height;
  const total = dims.width * dims.height;
  return total ? (regionArea / total) * 100 : 0;
}

function locationLabel(
  region: DiffRegion,
  dims: { width: number; height: number },
): string {
  const coverage = regionCoverage(region, dims);
  if (coverage > 75) return 'Across the full screen';

  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  const col =
    cx < dims.width * 0.33
      ? 'left'
      : cx > dims.width * 0.67
        ? 'right'
        : 'center';
  const row =
    cy < dims.height * 0.25
      ? 'top'
      : cy > dims.height * 0.75
        ? 'bottom'
        : 'middle';

  const colLabel =
    col === 'left' ? 'left side' : col === 'right' ? 'right side' : 'center';
  const rowLabel =
    row === 'top'
      ? 'Top'
      : row === 'bottom'
        ? 'Bottom'
        : 'Middle';

  if (row === 'top' && col === 'center') return 'Top of the page (header area)';
  if (row === 'bottom' && col === 'center') return 'Bottom of the page (footer area)';
  if (row === 'middle' && col === 'center') return 'Center of the page';
  if (row === 'middle') return `${rowLabel} — ${colLabel}`;
  return `${rowLabel} ${colLabel}`;
}

function sizeNote(region: DiffRegion, dims: { width: number; height: number }): string {
  const coverage = regionCoverage(region, dims);
  if (coverage > 60) return 'Covers most of the screen';
  if (coverage > 25) return 'Covers a large section';
  if (coverage > 8) return 'Covers a medium section';
  return 'A small UI element or detail';
}

function differenceNote(diffPercentage: number): string {
  if (diffPercentage > 40) {
    return 'Looks very different — layout, colors, or content may not match the design.';
  }
  if (diffPercentage > 20) {
    return 'Clearly different — check spacing, typography, colors, or missing elements.';
  }
  if (diffPercentage > 8) {
    return 'Noticeably different — often caused by fonts, borders, or alignment shifts.';
  }
  return 'Slightly different — usually minor styling or anti-aliasing.';
}

function severityMeta(severity: DiffRegion['severity']) {
  switch (severity) {
    case 'high':
      return {
        severityLabel: 'Fix first',
        severityHint: 'Large visual gap — likely a real implementation issue.',
      };
    case 'medium':
      return {
        severityLabel: 'Review',
        severityHint: 'Visible to users — worth checking against the design.',
      };
    default:
      return {
        severityLabel: 'Minor',
        severityHint: 'Small visual drift — may be acceptable.',
      };
  }
}

export function describeRegion(
  region: DiffRegion,
  dims: { width: number; height: number },
): RegionInsight {
  const location = locationLabel(region, dims);
  const coveragePercent = +regionCoverage(region, dims).toFixed(1);

  return {
    title: location,
    location,
    sizeNote: sizeNote(region, dims),
    differenceNote: differenceNote(region.diffPercentage),
    ...severityMeta(region.severity),
    coveragePercent,
  };
}

export function describeReport(
  mismatchPercentage: number,
  issueCount: number,
): ReportInsight {
  const match = 100 - mismatchPercentage;

  let matchLabel: string;
  let matchHint: string;
  if (match >= 95) {
    matchLabel = 'Excellent match';
    matchHint = 'Implementation is very close to the design.';
  } else if (match >= 85) {
    matchLabel = 'Good match';
    matchHint = 'Most of the screen matches, with a few areas to review.';
  } else if (match >= 70) {
    matchLabel = 'Partial match';
    matchHint = 'Several areas differ from the design — review the issues below.';
  } else {
    matchLabel = 'Low match';
    matchHint = 'Implementation differs significantly from the design.';
  }

  const summary =
    issueCount === 0
      ? 'No meaningful visual differences were detected at this viewport.'
      : issueCount === 1
        ? `We found 1 area that looks different from your design (${match.toFixed(0)}% of the screen matches overall).`
        : `We found ${issueCount} areas that look different from your design (${match.toFixed(0)}% of the screen matches overall).`;

  return {
    matchLabel,
    matchHint,
    summary,
    issueCountLabel:
      issueCount === 0
        ? 'No issues'
        : `${issueCount} area${issueCount === 1 ? '' : 's'} to review`,
  };
}
