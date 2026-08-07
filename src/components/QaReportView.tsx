'use client';

import { useState, useRef, useEffect, type MutableRefObject } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList,
  Wrench,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type { Report } from '@/lib/types';
import { buildQaReport, priorityLabel, type QaVerdict, type QaBug } from '@/lib/qa-report';
import { reportAssetBase } from '@/lib/report-urls';
import ComparisonViewer from '@/components/ComparisonViewer';
import IssueScreenHighlight, { BugOverviewMap } from '@/components/IssueScreenHighlight';

type Props = {
  report: Report;
  activeViewport: number;
  onViewportChange: (idx: number) => void;
};

const VERDICT_STYLES: Record<
  QaVerdict,
  { bg: string; border: string; text: string; icon: typeof CheckCircle2 }
> = {
  pass: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: CheckCircle2,
  },
  fail: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: XCircle,
  },
  review: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    icon: AlertCircle,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function IssueCard({
  bug,
  index,
  base,
  currentResult,
  activeBugId,
  bugRefs,
  compact = false,
}: {
  bug: QaBug;
  index: number;
  base: string;
  currentResult: NonNullable<Props['report']['results'][number]>;
  activeBugId: number | null;
  bugRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  compact?: boolean;
}) {
  const region = {
    id: bug.regionId,
    x: bug.x,
    y: bug.y,
    width: bug.width,
    height: bug.height,
  };
  const isComponent = bug.issueKind === 'component' || Boolean(bug.componentType);
  const isDetail = bug.issueKind === 'detail';
  const isActive = activeBugId === null || activeBugId === bug.regionId;
  const badgeColor = isComponent ? 'bg-red-600' : 'bg-amber-600';
  const borderActive = isComponent
    ? 'border-red-400 ring-2 ring-red-100'
    : 'border-amber-400 ring-2 ring-amber-100';

  return (
    <div
      ref={(el) => {
        bugRefs.current[bug.regionId] = el;
      }}
      className={`bg-white rounded-xl border overflow-hidden transition-all ${
        activeBugId === bug.regionId ? `${borderActive} shadow-lg` : 'border-slate-200'
      }`}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start gap-3">
        <span
          className={`w-8 h-8 ${badgeColor} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
              {bug.title}
            </h4>
            {isComponent && bug.matchPercent !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-xs font-bold">
                {bug.matchPercent}% match
              </span>
            )}
            {isDetail && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                Detail
              </span>
            )}
          </div>
          {isComponent ? (
            <p className="text-sm font-medium text-indigo-700 mt-1">
              Component: {bug.componentLabel}
            </p>
          ) : (
            <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>
                {bug.withinComponent ? (
                  <>
                    Inside <strong>{bug.withinComponent}</strong> — {bug.location}
                  </>
                ) : (
                  <>
                    Location: <strong>{bug.location}</strong>
                  </>
                )}
              </span>
            </p>
          )}
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{bug.whatIsWrong}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
            bug.priority === 'blocker'
              ? 'bg-red-100 text-red-800'
              : bug.priority === 'should-fix'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {priorityLabel(bug.priority)}
        </span>
      </div>

      {(bug.cropDesign || bug.cropActual) && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
            {isComponent ? `Compare: ${bug.componentLabel}` : 'Side-by-side comparison'}
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  D
                </span>
                Design shows
              </p>
              {bug.cropDesign ? (
                <div
                  className={`rounded-lg border-2 border-indigo-300 overflow-auto bg-indigo-50/30 ${
                    compact ? 'max-h-64' : 'max-h-[480px]'
                  }`}
                >
                  <img
                    src={`${base}/${bug.cropDesign}`}
                    alt={`Design: ${bug.componentLabel || bug.location}`}
                    className="w-full block"
                  />
                </div>
              ) : (
                <div className="h-32 bg-slate-50 rounded-lg border border-dashed border-slate-200" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  B
                </span>
                Build shows
              </p>
              {bug.cropActual ? (
                <div
                  className={`rounded-lg border-2 border-red-300 overflow-auto bg-red-50/30 ${
                    compact ? 'max-h-64' : 'max-h-[480px]'
                  }`}
                >
                  <img
                    src={`${base}/${bug.cropActual}`}
                    alt={`Build: ${bug.componentLabel || bug.location}`}
                    className="w-full block"
                  />
                </div>
              ) : (
                <div className="h-32 bg-slate-50 rounded-lg border border-dashed border-slate-200" />
              )}
            </div>
          </div>
        </div>
      )}

      {bug.checklist && bug.checklist.length > 0 && (
        <div className="px-5 py-4 bg-amber-50/60 border-b border-amber-100">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">
            Designer review checklist
          </p>
          <ul className="space-y-1.5">
            {bug.checklist.map((item, i) => (
              <li key={i} className="text-sm text-amber-900 flex gap-2">
                <span className="text-amber-500 shrink-0">□</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`p-5 bg-slate-50 ${compact ? '' : 'border-b border-slate-100'}`}>
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
          Where this is on the full screen
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          <IssueScreenHighlight
            imageSrc={`${base}/${currentResult.designImage}`}
            dims={currentResult.dimensions}
            region={region}
            label="Design — highlighted"
            variant="design"
            spotlight={isDetail}
            active={isActive}
          />
          <IssueScreenHighlight
            imageSrc={`${base}/${currentResult.actualImage}`}
            dims={currentResult.dimensions}
            region={region}
            label="Build — highlighted"
            variant="build"
            spotlight={isDetail}
            active={isActive}
          />
        </div>
      </div>

      <div className="px-5 py-3 bg-indigo-50 border-t border-indigo-100">
        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">
          Dev action
        </p>
        <p className="text-sm text-indigo-900 font-medium">{bug.whatToDo}</p>
      </div>
    </div>
  );
}

export default function QaReportView({ report, activeViewport, onViewportChange }: Props) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeBugId, setActiveBugId] = useState<number | null>(null);
  const bugRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const qa = buildQaReport(report);
  const style = VERDICT_STYLES[qa.overallVerdict];
  const VerdictIcon = style.icon;
  const currentResult = report.results[activeViewport];
  const base = reportAssetBase(report.id);

  const viewportBugs = qa.bugs.filter((b) => b.viewport === currentResult?.viewport.name);
  const componentBugs = viewportBugs.filter((b) => b.issueKind === 'component' || b.componentType);
  const detailBugs = viewportBugs.filter((b) => b.issueKind === 'detail');

  useEffect(() => {
    setActiveBugId(null);
  }, [activeViewport]);

  function scrollToBug(regionId: number) {
    setActiveBugId(regionId);
    const el = bugRefs.current[regionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Overall verdict */}
      <div className={`rounded-2xl border-2 p-6 ${style.bg} ${style.border}`}>
        <div className="flex items-start gap-4">
          <VerdictIcon className={`w-10 h-10 shrink-0 ${style.text}`} />
          <div>
            <p className={`text-2xl font-bold ${style.text}`}>Visual QA: {qa.overallLabel}</p>
            <p className={`mt-2 text-base leading-relaxed ${style.text} opacity-90`}>
              {qa.overallSummary}
            </p>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-3 gap-3">
          {qa.viewports.map((vp, idx) => {
            const vpStyle = VERDICT_STYLES[vp.verdict];
            const VpIcon = vpStyle.icon;
            return (
              <button
                key={vp.viewport}
                type="button"
                onClick={() => onViewportChange(idx)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  activeViewport === idx
                    ? 'border-indigo-500 bg-white shadow-sm ring-2 ring-indigo-200'
                    : 'border-white/60 bg-white/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <VpIcon className={`w-4 h-4 ${vpStyle.text}`} />
                  <span className="font-semibold text-slate-800 text-sm">{vp.viewport}</span>
                  <span className={`ml-auto text-xs font-bold ${vpStyle.text}`}>{vp.verdictLabel}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-snug">{vp.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alignment warning */}
      {currentResult?.designAlignment?.warnings &&
        currentResult.designAlignment.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Design and screenshot may not be perfectly aligned
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Your design was {currentResult.designAlignment.originalWidth}×
                {currentResult.designAlignment.originalHeight}px but the capture is{' '}
                {currentResult.designAlignment.viewportWidth}×
                {currentResult.designAlignment.viewportHeight}px. Thumbnails compare the same
                screen coordinates, but mismatched export sizes can make crops look unrelated.
              </p>
              <ul className="mt-2 space-y-1">
                {currentResult.designAlignment.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800">
                    • {w}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-2 font-medium">
                Tip: Export your Figma frame at exactly {currentResult.viewport.width}×
                {currentResult.viewport.height}px (1×, not 2×) for accurate comparisons.
              </p>
            </div>
          </div>
        )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QA checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              For QA — test steps
            </h3>
            <CopyButton text={qa.qaChecklist.map((s, i) => `${i + 1}. ${s}`).join('\n')} />
          </div>
          <ol className="space-y-2">
            {qa.qaChecklist.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Dev checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              For Developers — what to fix
            </h3>
            <CopyButton text={qa.devChecklist.join('\n')} />
          </div>
          {qa.bugs.length === 0 ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-4">
              No fixes needed. The build matches the design.
            </p>
          ) : (
            <ul className="space-y-2">
              {qa.devChecklist.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Issues overview + component + detail sections */}
      {viewportBugs.length > 0 && currentResult && (
        <div className="space-y-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">What doesn&apos;t match the design</h3>
            <p className="text-sm text-slate-500 mb-4">
              Component-level issues show which major UI areas differ. Additional differences catch
              specific elements, spacing, or styling details beyond those zones.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <BugOverviewMap
                imageSrc={`${base}/${currentResult.actualImage}`}
                dims={currentResult.dimensions}
                regions={currentResult.regions}
                activeId={activeBugId}
                onSelect={scrollToBug}
              />
            </div>
          </div>

          {componentBugs.length > 0 && (
            <div>
              <h4 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-red-500 bg-red-500/20" />
                Component differences
                <span className="text-sm font-normal text-slate-500">({componentBugs.length})</span>
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                Major UI areas — side navigation, header, toolbar, main content.
              </p>
              <div className="space-y-8">
                {componentBugs.map((bug, idx) => (
                  <IssueCard
                    key={bug.id}
                    bug={bug}
                    index={idx + 1}
                    base={base}
                    currentResult={currentResult}
                    activeBugId={activeBugId}
                    bugRefs={bugRefs}
                  />
                ))}
              </div>
            </div>
          )}

          {detailBugs.length > 0 && (
            <div>
              <h4 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-dashed border-amber-500 bg-amber-500/20" />
                Additional differences
                <span className="text-sm font-normal text-slate-500">({detailBugs.length})</span>
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                Specific spots that also differ — buttons, text, spacing, colors, or icons within or
                outside the components above.
              </p>
              <div className="space-y-6">
                {detailBugs.map((bug, idx) => (
                  <IssueCard
                    key={bug.id}
                    bug={bug}
                    index={componentBugs.length + idx + 1}
                    base={base}
                    currentResult={currentResult}
                    activeBugId={activeBugId}
                    bugRefs={bugRefs}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewportBugs.length === 0 && currentResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <p className="font-semibold text-emerald-800">No bugs on {currentResult.viewport.name}</p>
          <p className="text-sm text-emerald-700 mt-1">This screen size matches the design.</p>
        </div>
      )}

      {/* Technical tools — hidden by default */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnical((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 text-left"
        >
          <span className="text-sm font-medium text-slate-600">
            Designer / technical tools (pixel diff, rulers, blink compare…)
          </span>
          {showTechnical ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {showTechnical && currentResult && (
          <div className="p-5 border-t border-slate-200">
            <ComparisonViewer result={currentResult} reportId={report.id} />
          </div>
        )}
      </div>
    </div>
  );
}
