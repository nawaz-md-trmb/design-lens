'use client';

import { useState, useRef, useCallback } from 'react';
import { strToU8, zipSync } from 'fflate';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MapPin,
  ScanSearch,
  Wrench,
} from 'lucide-react';
import type { ViewportResult, DiffRegion } from '@/lib/types';
import { describeRegion, describeReport } from '@/lib/region-insights';
import RulerAnnotations from '@/components/RulerAnnotations';
import PixelInspectOverlay from '@/components/PixelInspectOverlay';
import BlinkCompare from '@/components/BlinkCompare';

interface Props {
  result: ViewportResult;
  reportId: string;
}

type ViewMode = 'issues' | 'annotated' | 'side-by-side' | 'overlay' | 'diff' | 'blink' | 'pixel';

const SEV = {
  high: {
    border: 'border-red-500',
    borderHover: 'border-red-600',
    bg: 'bg-red-500/12',
    bgHover: 'bg-red-500/22',
    badge: 'bg-red-500',
    pill: 'bg-red-100 text-red-800',
    ring: 'ring-red-200',
  },
  medium: {
    border: 'border-amber-500',
    borderHover: 'border-amber-600',
    bg: 'bg-amber-500/12',
    bgHover: 'bg-amber-500/22',
    badge: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-900',
    ring: 'ring-amber-200',
  },
  low: {
    border: 'border-yellow-500',
    borderHover: 'border-yellow-600',
    bg: 'bg-yellow-500/12',
    bgHover: 'bg-yellow-500/22',
    badge: 'bg-yellow-500',
    pill: 'bg-yellow-100 text-yellow-900',
    ring: 'ring-yellow-200',
  },
} as const;

const VIEW_MODES: { key: ViewMode; label: string; hint: string }[] = [
  { key: 'issues', label: 'Issue guide', hint: 'Plain-language breakdown of each difference' },
  { key: 'annotated', label: 'Ruler map', hint: 'Dimension lines and callouts on the live build' },
  { key: 'side-by-side', label: 'Side by side', hint: 'Design mockup next to the live build' },
  { key: 'overlay', label: 'Slide reveal', hint: 'Drag to compare design over implementation' },
  { key: 'pixel', label: 'Pixel inspect', hint: '8× loupe with grid — hover to compare exact pixels' },
  { key: 'blink', label: 'Blink diff', hint: 'Rapidly toggles design vs build to spot movement' },
  { key: 'diff', label: 'Changed pixels', hint: 'Red areas = pixels that differ' },
];

function RegionOverlays({
  regions,
  dims,
  active,
  onHover,
  onSelect,
}: {
  regions: DiffRegion[];
  dims: { width: number; height: number };
  active: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      {regions.map((r) => {
        const s = SEV[r.severity];
        const isActive = active === r.id;
        return (
          <button
            key={r.id}
            type="button"
            aria-label={`Issue ${r.id}`}
            className={`absolute rounded-md transition-all duration-150 cursor-pointer
              ${isActive ? `border-[3px] ${s.borderHover} ${s.bgHover} shadow-lg z-10 ring-4 ${s.ring}` : `border-2 ${s.border} ${s.bg}`}`}
            style={{
              left: `${(r.x / dims.width) * 100}%`,
              top: `${(r.y / dims.height) * 100}%`,
              width: `${(r.width / dims.width) * 100}%`,
              height: `${(r.height / dims.height) * 100}%`,
            }}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(r.id)}
          >
            <span
              className={`absolute -top-3 -left-1 min-w-[24px] h-6 ${s.badge}
                text-white text-xs leading-6 text-center rounded-full font-bold shadow-sm px-1.5`}
            >
              {r.id}
            </span>
          </button>
        );
      })}
    </>
  );
}

function IssueCard({
  region,
  reportId,
  dims,
  isActive,
  onSelect,
}: {
  region: DiffRegion;
  reportId: string;
  dims: { width: number; height: number };
  isActive: boolean;
  onSelect: () => void;
}) {
  const s = SEV[region.severity];
  const insight = describeRegion(region, dims);
  const base = `/reports/${reportId}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        isActive
          ? 'border-indigo-500 bg-indigo-50/70 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-8 h-8 ${s.badge} text-white text-sm font-bold rounded-full flex items-center justify-center`}
        >
          {region.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900">{insight.title}</h4>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.pill}`}>
              {insight.severityLabel}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{insight.differenceNote}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {insight.sizeNote}
            </span>
            <span>{region.diffPercentage}% of pixels differ in this area</span>
          </div>
        </div>
      </div>

      {(region.cropDesignImage || region.cropActualImage) && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Design spec
            </p>
            {region.cropDesignImage ? (
              <img
                src={`${base}/${region.cropDesignImage}`}
                alt={`Design — issue ${region.id}`}
                className="w-full rounded-lg border-2 border-indigo-200 bg-white"
              />
            ) : (
              <div className="h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
            )}
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Dev build
            </p>
            {region.cropActualImage ? (
              <img
                src={`${base}/${region.cropActualImage}`}
                alt={`Implementation — issue ${region.id}`}
                className="w-full rounded-lg border-2 border-amber-200 bg-white"
              />
            ) : (
              <div className="h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
            )}
          </div>
        </div>
      )}

      {region.fixes && region.fixes.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            Suggested fix for devs
          </p>
          {region.fixes.map((fix, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-slate-800">{fix.title}</p>
              <p className="text-slate-600 mt-0.5">{fix.detail}</p>
              <p className="text-indigo-700 font-medium mt-1 text-xs bg-indigo-50 border border-indigo-100 rounded px-2 py-1.5">
                → {fix.action}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-indigo-600 font-medium">
        {isActive ? 'Highlighted on screen below' : 'Click to highlight on screen'}
      </p>
    </button>
  );
}

export default function ComparisonViewer({ result, reportId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('issues');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeRegion, setActiveRegion] = useState<number | null>(
    result.regions[0]?.id ?? null,
  );
  const [zoom, setZoom] = useState(100);
  const [downloading, setDownloading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [blinkPlaying, setBlinkPlaying] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const imageAreaRef = useRef<HTMLDivElement>(null);

  const base = `/reports/${reportId}`;
  const designSrc = `${base}/${result.designImage}`;
  const actualSrc = `${base}/${result.actualImage}`;
  const diffSrc = `${base}/${result.diffImage}`;

  const scale = zoom / 100;
  const dims = result.dimensions;
  const regions = result.regions;
  const reportInsight = describeReport(result.mismatchPercentage, regions.length);
  const matchScore = (100 - result.mismatchPercentage).toFixed(0);

  const scoreColor =
    result.mismatchPercentage < 5
      ? 'text-emerald-600'
      : result.mismatchPercentage < 20
        ? 'text-amber-600'
        : 'text-red-600';
  const scoreBg =
    result.mismatchPercentage < 5
      ? 'bg-emerald-50 border-emerald-200'
      : result.mismatchPercentage < 20
        ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200';

  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleSliderMove(e.clientX);
    },
    [handleSliderMove],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      handleSliderMove(e.clientX);
    },
    [handleSliderMove],
  );
  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const focusRegion = useCallback(
    (region: DiffRegion) => {
      setActiveRegion(region.id);
      setViewMode('annotated');
      if (!imageAreaRef.current) return;
      const container = imageAreaRef.current;
      const scrollY = (region.y / dims.height) * container.scrollHeight * scale - 80;
      container.scrollTo({ top: Math.max(0, scrollY), behavior: 'smooth' });
    },
    [dims.height, scale],
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const allFiles: Array<{ name: string; url: string }> = [
        { name: result.designImage, url: designSrc },
        { name: result.actualImage, url: actualSrc },
        { name: result.diffImage, url: diffSrc },
        { name: result.annotatedImage, url: `${base}/${result.annotatedImage}` },
      ];

      regions.forEach((r) => {
        if (r.cropDesignImage)
          allFiles.push({ name: r.cropDesignImage, url: `${base}/${r.cropDesignImage}` });
        if (r.cropActualImage)
          allFiles.push({ name: r.cropActualImage, url: `${base}/${r.cropActualImage}` });
      });

      const fetched = await Promise.all(
        allFiles.map(async ({ name, url }) => {
          const res = await fetch(url);
          const arr = new Uint8Array(await res.arrayBuffer());
          return { name, arr };
        }),
      );

      const summary = [
        `DesignLens Report — ${result.viewport.name}`,
        `${reportInsight.matchLabel}: ${matchScore}% similar`,
        reportInsight.summary,
        '',
        ...regions.map((r) => {
          const insight = describeRegion(r, dims);
          return `#${r.id} ${insight.title} [${insight.severityLabel}] — ${insight.differenceNote}`;
        }),
      ].join('\n');

      const files: Record<string, Uint8Array> = { 'summary.txt': strToU8(summary) };
      fetched.forEach(({ name, arr }) => {
        files[name] = arr;
      });

      const zip = zipSync(files);
      const blob = new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `designlens-${result.viewport.slug}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  };

  const scaledStyle = {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
  };

  const activeMode = VIEW_MODES.find((m) => m.key === viewMode);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={`rounded-2xl border px-6 py-5 ${scoreBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-600">{reportInsight.matchLabel}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-bold ${scoreColor}`}>{matchScore}%</span>
              <span className="text-slate-600">similar to design</span>
            </div>
            <p className="mt-2 text-sm text-slate-700 max-w-2xl leading-relaxed">
              {reportInsight.summary}
            </p>
            <p className="mt-1 text-xs text-slate-500">{reportInsight.matchHint}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/80 border border-white px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">{reportInsight.issueCountLabel}</p>
            <p className="text-xs mt-1 text-slate-500">
              {regions.length > 0
                ? 'Each issue shows design vs what was built.'
                : 'Nothing major stood out at this screen size.'}
            </p>
          </div>
        </div>
      </div>

      {/* How to read */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            How to read this report
          </span>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {showGuide && (
          <div className="px-5 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3 grid md:grid-cols-4 gap-4">
            <div>
              <p className="font-medium text-slate-800 mb-1">Similarity score</p>
              <p>Higher is better. 100% means every pixel matches. Small gaps are normal (fonts, rendering).</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Numbered issues</p>
              <p>Each box marks where the build looks different. Compare the design crop vs the built crop.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Ruler map</p>
              <p>Dimension lines show exact position (from top-left), width, height, and a callout arrow to each difference.</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Changed pixels view</p>
              <p>Red highlights show exactly which pixels differ — useful for spacing and color checks.</p>
            </div>
          </div>
        )}
      </div>

      {/* View controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1">
            {VIEW_MODES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {activeMode && (
            <p className="text-xs text-slate-500 mt-2">{activeMode.hint}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-10 text-right">{zoom}%</span>
            <input
              type="range"
              min={25}
              max={200}
              step={5}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-28 accent-indigo-600"
              title="Zoom"
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
          >
            {downloading ? 'Zipping…' : 'Download report'}
          </button>
          {viewMode === 'blink' && (
            <button
              type="button"
              onClick={() => setBlinkPlaying((v) => !v)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            >
              {blinkPlaying ? 'Pause blink' : 'Play blink'}
            </button>
          )}
        </div>
      </div>

      {/* Issue guide — default view */}
      {viewMode === 'issues' && regions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ScanSearch className="w-4 h-4 text-indigo-600" />
            What looks different
          </div>
          {regions.map((region) => (
            <IssueCard
              key={region.id}
              region={region}
              reportId={reportId}
              dims={dims}
              isActive={activeRegion === region.id}
              onSelect={() => focusRegion(region)}
            />
          ))}
        </div>
      )}

      {viewMode === 'issues' && regions.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <p className="text-emerald-800 font-semibold">Looks good at this viewport</p>
          <p className="text-emerald-700 text-sm mt-1">
            The live build closely matches your design mockup.
          </p>
        </div>
      )}

      {/* Visual comparison panel */}
      {viewMode !== 'issues' && (
        <div
          ref={imageAreaRef}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto"
          style={{ maxHeight: '70vh' }}
        >
          {viewMode === 'annotated' && (
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
                Live build with ruler annotations — lines point to each difference. Click an issue to focus its rulers.
              </div>
              <div className="p-3">
                <div className="relative overflow-visible" style={scaledStyle}>
                  <img src={actualSrc} alt="Live build with rulers" className="w-full rounded" draggable={false} />
                  <RulerAnnotations
                    regions={regions}
                    dims={dims}
                    active={activeRegion}
                    onHover={setActiveRegion}
                    onSelect={setActiveRegion}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'side-by-side' && (
            <div>
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <div className="px-4 py-2 text-sm font-medium text-slate-700 text-center">
                  Your design (mockup)
                </div>
                <div className="px-4 py-2 text-sm font-medium text-slate-700 text-center">
                  Live build (screenshot)
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-3 overflow-hidden">
                  <div className="relative" style={scaledStyle}>
                    <img src={designSrc} alt="Design mockup" className="w-full rounded" draggable={false} />
                    <RegionOverlays
                      regions={regions}
                      dims={dims}
                      active={activeRegion}
                      onHover={setActiveRegion}
                      onSelect={setActiveRegion}
                    />
                  </div>
                </div>
                <div className="p-3 overflow-hidden">
                  <div className="relative" style={scaledStyle}>
                    <img src={actualSrc} alt="Live build" className="w-full rounded" draggable={false} />
                    <RulerAnnotations
                      regions={regions}
                      dims={dims}
                      active={activeRegion}
                      onHover={setActiveRegion}
                      onSelect={setActiveRegion}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'overlay' && (
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
                Drag the slider — design on the left, live build on the right
              </div>
              <div
                ref={sliderRef}
                className="relative select-none touch-none cursor-col-resize overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <div style={scaledStyle}>
                  <img src={actualSrc} alt="Live build" className="w-full block" draggable={false} />
                  <img
                    src={designSrc}
                    alt="Design mockup"
                    className="absolute inset-0 w-full h-full block"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    draggable={false}
                  />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 pointer-events-none z-10"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M6 3L2 9L6 15M12 3L16 9L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md pointer-events-none">
                  Design
                </div>
                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-md pointer-events-none">
                  Built
                </div>
              </div>
            </div>
          )}

          {viewMode === 'diff' && (
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-sm text-slate-600 flex flex-wrap items-center gap-3">
                <span>Red = pixels that differ between design and build</span>
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                  Different
                </span>
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" />
                  Same
                </span>
              </div>
              <div className="p-3 overflow-hidden">
                <div className="relative" style={scaledStyle}>
                  <img src={diffSrc} alt="Changed pixels" className="w-full rounded" />
                  <RegionOverlays
                    regions={regions}
                    dims={dims}
                    active={activeRegion}
                    onHover={setActiveRegion}
                    onSelect={setActiveRegion}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'blink' && (
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
                Alternates design and build — use this to spot spacing shifts and layout jumps
              </div>
              <div className="p-3">
                <div style={scaledStyle}>
                  <BlinkCompare
                    designSrc={designSrc}
                    actualSrc={actualSrc}
                    playing={blinkPlaying}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'pixel' && (
            <div>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
                Hover for 8× magnifier with pixel grid — compare exact pixels at the same coordinates
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-3">
                  <div className="relative" style={scaledStyle}>
                    <img src={designSrc} alt="Design" className="w-full rounded" draggable={false} />
                  </div>
                </div>
                <div className="p-3">
                  <div className="relative" style={scaledStyle}>
                    <img src={actualSrc} alt="Build" className="w-full rounded" draggable={false} />
                    <PixelInspectOverlay
                      designSrc={designSrc}
                      actualSrc={actualSrc}
                      naturalWidth={dims.width}
                      naturalHeight={dims.height}
                      enabled
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini map when in issue guide mode */}
      {viewMode === 'issues' && regions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Where issues appear on screen</h3>
            <button
              type="button"
              onClick={() => setViewMode('annotated')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Open ruler map
            </button>
          </div>
          <div className="p-4">
            <div className="relative max-w-3xl mx-auto">
              <img src={actualSrc} alt="Overview with ruler annotations" className="w-full rounded-lg border border-slate-200" />
              <RulerAnnotations
                regions={regions}
                dims={dims}
                active={activeRegion}
                onHover={setActiveRegion}
                onSelect={setActiveRegion}
                emphasizeActive={false}
              />
            </div>
            <p className="text-center text-xs text-slate-500 mt-3">
              Rulers show position, size, and callout arrows to each difference — click to select an issue above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
