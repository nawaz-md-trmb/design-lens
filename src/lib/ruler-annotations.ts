import type { DiffRegion } from './types';

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#eab308',
} as const;

function colorFor(severity: DiffRegion['severity']): string {
  return COLORS[severity];
}

function dimLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  strokeWidth: number,
  dashed = false,
): string {
  const dash = dashed ? ' stroke-dasharray="6 4"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}"${dash} stroke-linecap="round"/>`;
}

function labelBox(
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize = 12,
): string {
  const padX = 6;
  const padY = 4;
  const w = text.length * (fontSize * 0.58) + padX * 2;
  const h = fontSize + padY * 2;
  const rx = x - w / 2;
  const ry = y - h / 2;
  return [
    `<rect x="${rx}" y="${ry}" width="${w}" height="${h}" rx="4" fill="white" fill-opacity="0.95" stroke="${color}" stroke-width="1.5"/>`,
    `<text x="${x}" y="${y + fontSize / 3}" text-anchor="middle" fill="${color}" font-size="${fontSize}" font-weight="600" font-family="ui-sans-serif,system-ui,sans-serif">${text}</text>`,
  ].join('');
}

type CalloutSide = 'top' | 'right' | 'bottom' | 'left';

function pickCalloutSide(
  region: DiffRegion,
  dims: { width: number; height: number },
): CalloutSide {
  const spaceTop = region.y;
  const spaceBottom = dims.height - (region.y + region.height);
  const spaceLeft = region.x;
  const spaceRight = dims.width - (region.x + region.width);

  const spaces: Array<[CalloutSide, number]> = [
    ['top', spaceTop],
    ['bottom', spaceBottom],
    ['left', spaceLeft],
    ['right', spaceRight],
  ];
  spaces.sort((a, b) => b[1] - a[1]);
  return spaces[0][0];
}

function calloutAnchor(
  region: DiffRegion,
  side: CalloutSide,
): { lx: number; ly: number; ax: number; ay: number } {
  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  const offset = 56;

  switch (side) {
    case 'top':
      return { lx: cx, ly: region.y - offset, ax: cx, ay: region.y };
    case 'bottom':
      return { lx: cx, ly: region.y + region.height + offset, ax: cx, ay: region.y + region.height };
    case 'left':
      return { lx: region.x - offset, ly: cy, ax: region.x, ay: cy };
    case 'right':
      return { lx: region.x + region.width + offset, ly: cy, ax: region.x + region.width, ay: cy };
  }
}

function regionRulerShapes(
  region: DiffRegion,
  dims: { width: number; height: number },
  activeId: number | null,
): string {
  const color = colorFor(region.severity);
  const isActive = activeId === null || activeId === region.id;
  const opacity = isActive ? 1 : 0.38;
  const stroke = isActive ? 2.5 : 1.5;
  const { x, y, width, height, id } = region;

  const cx = x + width / 2;
  const cy = y + height / 2;

  const widthRulerY = y > 72 ? y - 28 : y + height + 28;
  const heightRulerX =
    x + width < dims.width - 90 ? x + width + 28 : x - 28;

  const side = pickCalloutSide(region, dims);
  const callout = calloutAnchor(region, side);
  const calloutLabel = `#${id}`;

  const shapes: string[] = [
    `<g opacity="${opacity}" data-region="${id}">`,

    // Region bounds
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="${stroke + 1}" rx="4"/>`,

    // Corner ticks
    `<path d="M ${x} ${y + 14} L ${x} ${y} L ${x + 14} ${y}" fill="none" stroke="${color}" stroke-width="${stroke + 0.5}" stroke-linecap="round"/>`,
    `<path d="M ${x + width - 14} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - 14}" fill="none" stroke="${color}" stroke-width="${stroke + 0.5}" stroke-linecap="round"/>`,

    // Position from top-left (extension lines)
    dimLine(0, cy, x, cy, color, stroke, true),
    dimLine(x, 0, x, y, color, stroke, true),

    // Small ticks at origin projections
    dimLine(0, cy - 5, 0, cy + 5, color, stroke),
    dimLine(x - 5, 0, x + 5, 0, color, stroke),
    dimLine(x, y - 5, x, y + 5, color, stroke),

  ];

  // Position labels
  if (x > 40) {
    shapes.push(labelBox(x / 2, cy, `${Math.round(x)}px`, color, 11));
  }
  if (y > 40) {
    shapes.push(labelBox(x, y / 2, `${Math.round(y)}px`, color, 11));
  }

  // Width dimension
  shapes.push(
    dimLine(x, widthRulerY, x + width, widthRulerY, color, stroke),
    dimLine(x, widthRulerY - 6, x, widthRulerY + 6, color, stroke),
    dimLine(x + width, widthRulerY - 6, x + width, widthRulerY + 6, color, stroke),
    labelBox(cx, widthRulerY - (y > 72 ? 14 : -14), `W ${width}px`, color),
  );

  // Height dimension
  shapes.push(
    dimLine(heightRulerX, y, heightRulerX, y + height, color, stroke),
    dimLine(heightRulerX - 6, y, heightRulerX + 6, y, color, stroke),
    dimLine(heightRulerX - 6, y + height, heightRulerX + 6, y + height, color, stroke),
    labelBox(
      heightRulerX + (x + width < dims.width - 90 ? 14 : -14),
      cy,
      `H ${height}px`,
      color,
    ),
  );

  // Callout leader arrow to region center
  shapes.push(
    dimLine(callout.lx, callout.ly, callout.ax, callout.ay, color, stroke + 0.5),
    `<circle cx="${callout.ax}" cy="${callout.ay}" r="4" fill="${color}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="3" fill="white" stroke="${color}" stroke-width="2"/>`,
    `<circle cx="${callout.lx}" cy="${callout.ly}" r="13" fill="${color}"/>`,
    `<text x="${callout.lx}" y="${callout.ly + 4}" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="ui-sans-serif,system-ui,sans-serif">${calloutLabel}</text>`,
  );

  if (isActive) {
    const diffLabel = `${region.diffPercentage}% diff`;
    const labelY = side === 'bottom' ? callout.ly + 22 : callout.ly - 22;
    const labelX = side === 'left' || side === 'right' ? callout.lx : callout.lx;
    shapes.push(labelBox(labelX, labelY, diffLabel, color, 11));
  }

  shapes.push('</g>');
  return shapes.join('\n');
}

/** SVG overlay with dimension rulers and callout leaders for each diff region. */
export function buildRulerAnnotationSvg(
  regions: DiffRegion[],
  width: number,
  height: number,
  activeId: number | null = null,
): string {
  const body = regions
    .map((r) => regionRulerShapes(r, { width, height }, activeId))
    .join('\n');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">\n${body}\n</svg>`;
}

export { colorFor as rulerColorFor };
