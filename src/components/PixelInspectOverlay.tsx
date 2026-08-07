'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  designSrc: string;
  actualSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  enabled?: boolean;
};

const LOUPE_SIZE = 140;
const ZOOM = 8;

function imagePoint(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const nx = img.naturalWidth;
  const ny = img.naturalHeight;
  if (!nx || !ny) return null;
  const rect = img.getBoundingClientRect();
  const scale = Math.min(rect.width / nx, rect.height / ny);
  const drawnW = nx * scale;
  const drawnH = ny * scale;
  const offX = (rect.left + (rect.width - drawnW) / 2);
  const offY = (rect.top + (rect.height - drawnH) / 2);
  const x = (clientX - offX) / scale;
  const y = (clientY - offY) / scale;
  if (x < 0 || y < 0 || x > nx || y > ny) return null;
  return { x: Math.round(x), y: Math.round(y) };
}

function LoupeCanvas({
  src,
  x,
  y,
  label,
}: {
  src: string;
  x: number;
  y: number;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const half = LOUPE_SIZE / (2 * ZOOM);
    const sx = Math.max(0, Math.min(img.naturalWidth - half * 2, x - half));
    const sy = Math.max(0, Math.min(img.naturalHeight - half * 2, y - half));

    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, half * 2, half * 2, 0, 0, LOUPE_SIZE, LOUPE_SIZE);

    // Pixel grid
    ctx.strokeStyle = 'rgba(99,102,241,0.35)';
    ctx.lineWidth = 0.5;
    const step = LOUPE_SIZE / (half * 2);
    for (let i = 0; i <= half * 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, LOUPE_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(LOUPE_SIZE, i * step);
      ctx.stroke();
    }

    // Crosshair at center pixel
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    const cx = LOUPE_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, LOUPE_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cx);
    ctx.lineTo(LOUPE_SIZE, cx);
    ctx.stroke();
  }, [x, y]);

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <div className="relative rounded-lg border-2 border-indigo-300 overflow-hidden bg-white shadow-lg">
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el) el.onload = draw;
          }}
          src={src}
          alt=""
          className="hidden"
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} width={LOUPE_SIZE} height={LOUPE_SIZE} className="block" />
      </div>
    </div>
  );
}

export default function PixelInspectOverlay({
  designSrc,
  actualSrc,
  naturalWidth,
  naturalHeight,
  enabled = true,
}: Props) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const designRef = useRef<HTMLImageElement>(null);
  const actualRef = useRef<HTMLImageElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!enabled) return;
    const img = designRef.current ?? actualRef.current;
    if (!img) return;
    const pt = imagePoint(img, e.clientX, e.clientY);
    setPoint(pt);
    setCursor({ x: e.clientX, y: e.clientY });
  };

  if (!enabled) return null;

  return (
    <>
      <div
        className="absolute inset-0 z-30 cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => {
          setPoint(null);
          setCursor(null);
        }}
      />
      {point && cursor && (
        <div
          className="fixed z-50 pointer-events-none flex gap-3 p-3 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-2xl"
          style={{
            left: Math.min(cursor.x + 16, window.innerWidth - 320),
            top: Math.min(cursor.y + 16, window.innerHeight - 200),
          }}
        >
          <LoupeCanvas src={designSrc} x={point.x} y={point.y} label="Design" />
          <LoupeCanvas src={actualSrc} x={point.x} y={point.y} label="Build" />
          <div className="text-xs text-slate-600 self-end pb-1">
            <p className="font-mono font-semibold text-slate-800">
              {point.x}, {point.y}
            </p>
            <p className="text-slate-400 mt-0.5">
              {naturalWidth}×{naturalHeight}
            </p>
          </div>
        </div>
      )}
      <img ref={designRef} src={designSrc} alt="" className="hidden" />
      <img ref={actualRef} src={actualSrc} alt="" className="hidden" />
    </>
  );
}
