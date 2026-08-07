'use client';

import type { DiffRegion } from '@/lib/types';
import { describeRegion } from '@/lib/region-insights';

type Props = {
  imageSrc: string;
  dims: { width: number; height: number };
  region: Pick<DiffRegion, 'x' | 'y' | 'width' | 'height' | 'id'>;
  label: string;
  variant: 'design' | 'build';
  /** When true, dims the rest of the screen so only this region stands out */
  spotlight?: boolean;
  onClick?: () => void;
  active?: boolean;
};

export default function IssueScreenHighlight({
  imageSrc,
  dims,
  region,
  label,
  variant,
  spotlight = true,
  onClick,
  active = true,
}: Props) {
  const insight = describeRegion(region as DiffRegion, dims);
  const borderColor = variant === 'design' ? 'border-indigo-500' : 'border-red-500';
  const badgeColor = variant === 'design' ? 'bg-indigo-600' : 'bg-red-600';

  const left = (region.x / dims.width) * 100;
  const top = (region.y / dims.height) * 100;
  const width = (region.width / dims.width) * 100;
  const height = (region.height / dims.height) * 100;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full rounded-lg overflow-hidden border-2 text-left transition-all ${
          active ? 'border-slate-300 shadow-md' : 'border-slate-200 opacity-60'
        } ${onClick ? 'cursor-pointer hover:border-indigo-400' : 'cursor-default'}`}
      >
        <img src={imageSrc} alt={label} className="w-full block" draggable={false} />

        {/* Spotlight highlight */}
        <div
          className={`absolute rounded-sm border-[3px] ${borderColor} pointer-events-none ${
            spotlight ? 'shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]' : ''
          }`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        >
          <span
            className={`absolute -top-3 -left-3 min-w-[28px] h-7 px-1.5 ${badgeColor} text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white`}
          >
            {region.id}
          </span>
        </div>
      </button>
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{insight.location}</span>
        {' — '}
        {insight.sizeNote.toLowerCase()}
      </p>
    </div>
  );
}

/** All bugs marked on one full-screen overview */
export function BugOverviewMap({
  imageSrc,
  dims,
  regions,
  activeId,
  onSelect,
}: {
  imageSrc: string;
  dims: { width: number; height: number };
  regions: DiffRegion[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">Where bugs appear on the full screen</p>
      <p className="text-xs text-slate-500">Click a numbered box to jump to that bug below.</p>
      <div className="relative rounded-xl overflow-hidden border-2 border-slate-300 bg-slate-100">
        <img src={imageSrc} alt="Full build overview" className="w-full block" draggable={false} />
        {regions.map((r) => {
          const isActive = activeId === r.id;
          const isComponent = r.issueKind === 'component' || Boolean(r.componentType);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={`absolute rounded border-2 transition-all ${
                isComponent
                  ? isActive
                    ? 'border-red-500 bg-red-500/25 shadow-lg ring-4 ring-red-200 z-10'
                    : 'border-red-500/90 bg-red-500/15 hover:bg-red-500/25'
                  : isActive
                    ? 'border-amber-500 bg-amber-500/25 shadow-lg ring-4 ring-amber-200 z-10 border-dashed'
                    : 'border-amber-500/80 bg-amber-500/10 hover:bg-amber-500/20 border-dashed'
              }`}
              style={{
                left: `${(r.x / dims.width) * 100}%`,
                top: `${(r.y / dims.height) * 100}%`,
                width: `${(r.width / dims.width) * 100}%`,
                height: `${(r.height / dims.height) * 100}%`,
              }}
              aria-label={`Issue ${r.id}`}
            >
              <span
                className={`absolute -top-2.5 -left-2.5 min-w-[24px] h-6 text-white text-xs font-bold rounded-full flex items-center justify-center shadow border-2 border-white px-1 ${
                  isComponent ? 'bg-red-600' : 'bg-amber-600'
                }`}
              >
                {r.id}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-red-500 bg-red-500/20" />
          Component difference
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-dashed border-amber-500 bg-amber-500/20" />
          Additional difference
        </span>
      </div>
    </div>
  );
}
