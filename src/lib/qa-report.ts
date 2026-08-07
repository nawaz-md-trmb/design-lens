import type { DiffRegion, Report, ViewportResult, FixSuggestion } from './types';
import { describeRegion } from './region-insights';

export type QaVerdict = 'pass' | 'fail' | 'review';

export type QaBug = {
  id: string;
  viewport: string;
  title: string;
  whatIsWrong: string;
  whatToDo: string;
  priority: 'blocker' | 'should-fix' | 'minor';
  regionId: number;
  location: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cropDesign?: string;
  cropActual?: string;
  /** Layout component e.g. side-navigation */
  componentType?: string;
  componentLabel?: string;
  matchPercent?: number;
  checklist?: string[];
  issueKind?: 'component' | 'detail';
  withinComponent?: string;
};

export type QaViewportSummary = {
  viewport: string;
  verdict: QaVerdict;
  verdictLabel: string;
  issueCount: number;
  summary: string;
};

export type QaReportSummary = {
  overallVerdict: QaVerdict;
  overallLabel: string;
  overallSummary: string;
  viewports: QaViewportSummary[];
  bugs: QaBug[];
  qaChecklist: string[];
  devChecklist: string[];
};

const PASS_THRESHOLD = 85;

function viewportVerdict(result: ViewportResult): QaVerdict {
  const match = 100 - result.mismatchPercentage;
  const hasBlocker = result.regions.some((r) => r.severity === 'high');
  if (match >= PASS_THRESHOLD && result.regions.length === 0) return 'pass';
  if (match < 70 || hasBlocker) return 'fail';
  if (match < PASS_THRESHOLD || result.regions.length > 0) return 'review';
  return 'pass';
}

function verdictLabel(v: QaVerdict): string {
  if (v === 'pass') return 'Passed';
  if (v === 'fail') return 'Failed';
  return 'Needs review';
}

function priorityFromRegion(region: DiffRegion): QaBug['priority'] {
  if (region.severity === 'high') return 'blocker';
  if (region.severity === 'medium') return 'should-fix';
  return 'minor';
}

function bugTitle(region: DiffRegion, fix?: FixSuggestion): string {
  if (region.issueKind === 'detail') {
    if (region.withinComponent) {
      return `Additional difference in ${region.withinComponent}`;
    }
    return fix?.title || 'Additional visual difference';
  }
  if (region.componentType && region.label) {
    return `${region.label} doesn't match design`;
  }
  if (fix?.title) return fix.title;
  if (region.severity === 'high') return 'Screen section does not match design';
  return 'Visual difference from design';
}

function whatIsWrong(region: DiffRegion, fix?: FixSuggestion): string {
  if (region.designerNote) return region.designerNote;
  if (fix?.detail) return fix.detail;
  if (region.diffPercentage > 30) {
    return 'This part of the screen looks significantly different from the approved design.';
  }
  return 'This part of the screen does not match the approved design mockup.';
}

function whatToDo(region: DiffRegion, fixes?: FixSuggestion[]): string {
  const primary = fixes?.[0];
  if (primary?.action) return primary.action;
  return 'Open the design mockup side-by-side and align spacing, colors, and layout to match.';
}

function viewportSummary(result: ViewportResult): QaViewportSummary {
  const verdict = viewportVerdict(result);
  const issueCount = result.regions.length;
  const match = (100 - result.mismatchPercentage).toFixed(0);

  let summary: string;
  if (verdict === 'pass') {
    summary = `Build matches the design on ${result.viewport.name}. No issues found.`;
  } else if (verdict === 'fail') {
    summary = `Build does not match the design on ${result.viewport.name}. ${issueCount} issue(s) must be fixed before release.`;
  } else {
    summary = `Build is close (${match}% match) on ${result.viewport.name}, but ${issueCount} area(s) need a dev or QA check.`;
  }

  return {
    viewport: result.viewport.name,
    verdict,
    verdictLabel: verdictLabel(verdict),
    issueCount,
    summary,
  };
}

export function buildQaReport(report: Report): QaReportSummary {
  const viewports = report.results.map(viewportSummary);
  const bugs: QaBug[] = [];

  for (const result of report.results) {
    for (const region of result.regions) {
      const primaryFix = region.fixes?.[0];
      const insight = describeRegion(region, result.dimensions);
      bugs.push({
        id: `${result.viewport.slug}-${region.id}`,
        viewport: result.viewport.name,
        title: bugTitle(region, primaryFix),
        whatIsWrong: whatIsWrong(region, primaryFix),
        whatToDo: whatToDo(region, region.fixes),
        priority: priorityFromRegion(region),
        regionId: region.id,
        location: region.componentType ? region.label : insight.location,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        cropDesign: region.cropDesignImage,
        cropActual: region.cropActualImage,
        componentType: region.componentType,
        componentLabel: region.label,
        matchPercent: region.componentType
          ? +(100 - region.diffPercentage).toFixed(1)
          : undefined,
        checklist: region.checklist,
        issueKind: region.issueKind,
        withinComponent: region.withinComponent,
      });
    }
  }

  bugs.sort((a, b) => {
    const order = { blocker: 0, 'should-fix': 1, minor: 2 };
    return order[a.priority] - order[b.priority];
  });

  const hasFail = viewports.some((v) => v.verdict === 'fail');
  const hasReview = viewports.some((v) => v.verdict === 'review');
  const overallVerdict: QaVerdict = hasFail ? 'fail' : hasReview ? 'review' : 'pass';

  let overallSummary: string;
  if (overallVerdict === 'pass') {
    overallSummary =
      'The build matches the approved design across all tested screen sizes. Safe to mark visual QA as passed.';
  } else if (overallVerdict === 'fail') {
    overallSummary = `Visual QA failed. ${bugs.length} issue(s) found — dev must fix before this story can pass QA.`;
  } else {
    overallSummary = `Visual QA needs a human check. ${bugs.length} possible issue(s) found — review screenshots below and confirm with design.`;
  }

  const qaChecklist = [
    `Open the build: ${report.url}`,
    ...report.results.map(
      (r) => `Check ${r.viewport.name} (${r.viewport.width}×${r.viewport.height}) against the design`,
    ),
    ...(bugs.length > 0
      ? bugs.map((b, i) => `Verify bug #${i + 1} is fixed: ${b.title}`)
      : ['Confirm the screen matches the design mockup — no visual bugs']),
    'Mark the ticket Passed or Failed in your test tool',
  ];

  const devChecklist =
    bugs.length > 0
      ? bugs.map((b, i) => `#${i + 1} [${b.viewport}] ${b.whatToDo}`)
      : ['No visual fixes required for this build.'];

  return {
    overallVerdict,
    overallLabel: verdictLabel(overallVerdict),
    overallSummary,
    viewports,
    bugs,
    qaChecklist,
    devChecklist,
  };
}

export function priorityLabel(p: QaBug['priority']): string {
  if (p === 'blocker') return 'Must fix';
  if (p === 'should-fix') return 'Should fix';
  return 'Minor';
}
