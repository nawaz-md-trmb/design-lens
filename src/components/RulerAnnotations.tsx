'use client';

import type { DiffRegion } from '@/lib/types';

const COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#eab308' } as const;
const PAD = 72;

type Props = {
  regions: DiffRegion[];
  dims: { width: number; height: number };
  active: number | null;
  onHover?: (id: number | null) => void;
  onSelect?: (id: number) => void;
  emphasizeActive?: boolean;
};

function colorFor(severity: DiffRegion['severity']) {
  return COLORS[severity];
}

function pickCalloutSide(
  region: DiffRegion,
  dims: { width: number; height: number },
): 'top' | 'right' | 'bottom' | 'left' {
  const spaces: Array<['top' | 'right' | 'bottom' | 'left', number]> = [
    ['top', region.y],
    ['bottom', dims.height - (region.y + region.height)],
    ['left', region.x],
    ['right', dims.width - (region.x + region.width)],
  ];
  spaces.sort((a, b) => b[1] - a[1]);
  return spaces[0][0];
}

function RegionRulers({
  region,
  dims,
  isActive,
}: {
  region: DiffRegion;
  dims: { width: number; height: number };
  isActive: boolean;
}) {
  const color = colorFor(region.severity);
  const opacity = isActive ? 1 : 0.45;
  const stroke = isActive ? 2.5 : 1.5;
  const { x, y, width, height, id } = region;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const widthRulerY = y > 80 ? y - 24 : y + height + 24;
  const heightRulerX = x + width < dims.width - 80 ? x + width + 24 : x - 24;
  const side = pickCalloutSide(region, dims);
  const offset = 48;

  let lx = cx;
  let ly = cy;
  let ax = cx;
  let ay = cy;
  if (side === 'top') {
    ly = y - offset;
    ay = y;
  } else if (side === 'bottom') {
    ly = y + height + offset;
    ay = y + height;
  } else if (side === 'left') {
    lx = x - offset;
    ax = x;
  } else {
    lx = x + width + offset;
    ax = x + width;
  }

  return (
    <g opacity={opacity} pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.14}
        stroke={color}
        strokeWidth={stroke + 0.5}
        rx={4}
      />

      {/* Position guides from top-left */}
      <line x1={0} y1={cy} x2={x} y2={cy} stroke={color} strokeWidth={stroke} strokeDasharray="5 4" />
      <line x1={x} y1={0} x2={x} y2={y} stroke={color} strokeWidth={stroke} strokeDasharray="5 4" />
      <line x1={0} y1={cy - 4} x2={0} y2={cy + 4} stroke={color} strokeWidth={stroke} />
      <line x1={x - 4} y1={0} x2={x + 4} y2={0} stroke={color} strokeWidth={stroke} />

      {x > 48 && (
        <g>
          <rect x={x / 2 - 22} y={cy - 10} width={44} height={20} rx={4} fill="white" fillOpacity={0.95} stroke={color} />
          <text x={x / 2} y={cy + 4} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
            {Math.round(x)}px
          </text>
        </g>
      )}
      {y > 48 && (
        <g>
          <rect x={x - 22} y={y / 2 - 10} width={44} height={20} rx={4} fill="white" fillOpacity={0.95} stroke={color} />
          <text x={x} y={y / 2 + 4} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
            {Math.round(y)}px
          </text>
        </g>
      )}

      {/* Width ruler */}
      <line x1={x} y1={widthRulerY} x2={x + width} y2={widthRulerY} stroke={color} strokeWidth={stroke} />
      <line x1={x} y1={widthRulerY - 5} x2={x} y2={widthRulerY + 5} stroke={color} strokeWidth={stroke} />
      <line x1={x + width} y1={widthRulerY - 5} x2={x + width} y2={widthRulerY + 5} stroke={color} strokeWidth={stroke} />
      <rect x={cx - 34} y={widthRulerY + (y > 80 ? -26 : 6)} width={68} height={20} rx={4} fill="white" fillOpacity={0.95} stroke={color} />
      <text x={cx} y={widthRulerY + (y > 80 ? -12 : 20)} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
        W {width}px
      </text>

      {/* Height ruler */}
      <line x1={heightRulerX} y1={y} x2={heightRulerX} y2={y + height} stroke={color} strokeWidth={stroke} />
      <line x1={heightRulerX - 5} y1={y} x2={heightRulerX + 5} y2={y} stroke={color} strokeWidth={stroke} />
      <line x1={heightRulerX - 5} y1={y + height} x2={heightRulerX + 5} y2={y + height} stroke={color} strokeWidth={stroke} />
      <rect
        x={heightRulerX + (x + width < dims.width - 80 ? 8 : -76)}
        y={cy - 10}
        width={68}
        height={20}
        rx={4}
        fill="white"
        fillOpacity={0.95}
        stroke={color}
      />
      <text
        x={heightRulerX + (x + width < dims.width - 80 ? 42 : -42)}
        y={cy + 4}
        textAnchor="middle"
        fill={color}
        fontSize={11}
        fontWeight={600}
      >
        H {height}px
      </text>

      {/* Callout */}
      <line x1={lx} y1={ly} x2={ax} y2={ay} stroke={color} strokeWidth={stroke} />
      <circle cx={ax} cy={ay} r={4} fill={color} />
      <circle cx={cx} cy={cy} r={3} fill="white" stroke={color} strokeWidth={2} />
      <circle cx={lx} cy={ly} r={14} fill={color} />
      <text x={lx} y={ly + 4} textAnchor="middle" fill="white" fontSize={12} fontWeight={700}>
        {id}
      </text>
      {isActive && (
        <g>
          <rect x={lx - 30} y={ly + (side === 'bottom' ? 18 : -38)} width={60} height={20} rx={4} fill="white" fillOpacity={0.95} stroke={color} />
          <text x={lx} y={ly + (side === 'bottom' ? 32 : -24)} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
            {region.diffPercentage}%
          </text>
        </g>
      )}
    </g>
  );
}

export default function RulerAnnotations({
  regions,
  dims,
  active,
  onHover,
  onSelect,
  emphasizeActive = true,
}: Props) {
  const activeId = emphasizeActive ? active : null;

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox={`${-PAD} ${-PAD} ${dims.width + PAD * 2} ${dims.height + PAD * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {regions.map((r) => (
          <RegionRulers
            key={r.id}
            region={r}
            dims={dims}
            isActive={activeId === null || activeId === r.id}
          />
        ))}
      </svg>

      {regions.map((r) => {
        const color = colorFor(r.severity);
        const isActive = active === r.id;
        return (
          <button
            key={`hit-${r.id}`}
            type="button"
            aria-label={`Issue ${r.id}`}
            className="absolute z-20 cursor-pointer rounded-md"
            style={{
              left: `${(r.x / dims.width) * 100}%`,
              top: `${(r.y / dims.height) * 100}%`,
              width: `${(r.width / dims.width) * 100}%`,
              height: `${(r.height / dims.height) * 100}%`,
              background: isActive ? `${color}18` : 'transparent',
              boxShadow: isActive ? `inset 0 0 0 2px ${color}` : undefined,
            }}
            onMouseEnter={() => onHover?.(r.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onSelect?.(r.id)}
          />
        );
      })}
    </>
  );
}

export { colorFor as rulerColorFor };
