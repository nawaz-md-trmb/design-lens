'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Layers,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Globe,
  AlertCircle,
  MousePointer2,
  Figma,
} from 'lucide-react';
import { normalizeUrl } from '@/lib/utils';

function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

const PREVIEW_W = 1280;
const PREVIEW_H = 800;

type Phase = 'setup' | 'navigate' | 'comparing';

function clientToViewport(
  e: React.MouseEvent<HTMLImageElement>,
): { x: number; y: number } | null {
  const img = e.currentTarget;
  const nx = img.naturalWidth || PREVIEW_W;
  const ny = img.naturalHeight || PREVIEW_H;
  const rect = img.getBoundingClientRect();
  const scale = Math.min(rect.width / nx, rect.height / ny);
  const drawnW = nx * scale;
  const drawnH = ny * scale;
  const offX = (rect.width - drawnW) / 2;
  const offY = (rect.height - drawnH) / 2;
  const x = (e.clientX - rect.left - offX) / scale;
  const y = (e.clientY - rect.top - offY) / scale;
  if (x < 0 || y < 0 || x > nx || y > ny) return null;
  return {
    x: Math.max(0, Math.min(nx - 1, Math.round(x))),
    y: Math.max(0, Math.min(ny - 1, Math.round(y))),
  };
}

function imgToViewport(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const nx = img.naturalWidth || PREVIEW_W;
  const ny = img.naturalHeight || PREVIEW_H;
  const rect = img.getBoundingClientRect();
  const scale = Math.min(rect.width / nx, rect.height / ny);
  const drawnW = nx * scale;
  const drawnH = ny * scale;
  const offX = (rect.width - drawnW) / 2;
  const offY = (rect.height - drawnH) / 2;
  const x = (clientX - rect.left - offX) / scale;
  const y = (clientY - rect.top - offY) / scale;
  return {
    x: Math.max(0, Math.min(nx - 1, Math.round(x))),
    y: Math.max(0, Math.min(ny - 1, Math.round(y))),
  };
}

async function closeSessionApi(id: string) {
  await fetch(`/api/browser/session/${id}`, { method: 'DELETE' }).catch(() => {});
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [designSource, setDesignSource] = useState<'upload' | 'figma'>('upload');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaSourceUrl, setFigmaSourceUrl] = useState<string | null>(null);
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [designDimensions, setDesignDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [sessionBootstrapping, setSessionBootstrapping] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [loadingStatus, setLoadingStatus] = useState('');
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);

  // Debounce ref for scroll
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScroll = useRef({ deltaX: 0, deltaY: 0, x: 640, y: 400 });

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, or WebP)');
      return;
    }
    setDesignFile(file);
    setFigmaSourceUrl(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setDesignPreview(dataUrl);
      try {
        const dims = await readImageDimensions(dataUrl);
        setDesignDimensions(dims);
      } catch {
        setDesignDimensions(null);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearDesign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDesignFile(null);
    setDesignPreview(null);
    setDesignDimensions(null);
    setFigmaSourceUrl(null);
    setFigmaUrl('');
  }, []);

  const handleLoadFigma = async () => {
    if (!figmaUrl.trim()) return;
    setFigmaLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/figma/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figmaUrl: figmaUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load Figma frame');
      }
      const blob = await res.blob();
      const file = new File([blob], 'figma-frame.png', { type: 'image/png' });
      setDesignFile(file);
      setFigmaSourceUrl(figmaUrl.trim());
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setDesignPreview(dataUrl);
        try {
          const dims = await readImageDimensions(dataUrl);
          setDesignDimensions(dims);
        } catch {
          setDesignDimensions(null);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load Figma frame');
    } finally {
      setFigmaLoading(false);
    }
  };

  const canPreview = designFile && url.trim() && designDimensions;

  // Apply meta from action response (url + title returned by every action route)
  const applyMeta = useCallback((meta: { url?: string; title?: string }) => {
    if (meta.url) {
      setCurrentUrl(meta.url);
      setUrlInput(meta.url);
    }
    if (meta.title !== undefined) setPageTitle(meta.title);
  }, []);

  // ── SSE frame stream ──
  useEffect(() => {
    if (!sessionId || phase === 'comparing') return;

    const es = new EventSource(`/api/browser/session/${sessionId}/stream`);
    let consecutiveErrors = 0;

    es.onmessage = (event) => {
      const b64 = event.data as string;
      if (!b64) return;
      consecutiveErrors = 0;
      setPreviewSrc(`data:image/png;base64,${b64}`);
      setSessionBootstrapping(false);
    };

    es.onerror = () => {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        setError('Lost connection to browser session. Go back and open preview again.');
        setSessionBootstrapping(false);
        es.close();
      }
    };

    return () => {
      es.close();
    };
  }, [sessionId, phase]);

  const handleLoadPreview = async () => {
    if (!canPreview) return;
    const normalized = normalizeUrl(url);
    setError(null);
    setSessionBootstrapping(true);
    setPhase('navigate');
    setPreviewSrc(null);
    setPageTitle('');

    try {
      const res = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start browser session');
      }
      const data = (await res.json()) as { sessionId: string };
      setSessionId(data.sessionId);
      setCurrentUrl(normalized);
      setUrlInput(normalized);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start browser session');
      setPhase('setup');
      setSessionBootstrapping(false);
    }
  };

  const handleBackToSetup = async () => {
    if (sessionId) await closeSessionApi(sessionId);
    setPhase('setup');
    setSessionId(null);
    setCurrentUrl('');
    setUrlInput('');
    setPreviewSrc(null);
    setSessionBootstrapping(false);
    setSessionBusy(false);
    setPageTitle('');
  };

  // Generic action runner — parses url+title from response directly, no /meta poll
  const runSessionAction = useCallback(
    async (path: string, body?: object): Promise<boolean> => {
      if (!sessionId) return false;
      setSessionBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/browser/session/${sessionId}${path}`, {
          method: 'POST',
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || 'Action failed');
        }
        const data = await res.json().catch(() => ({}));
        applyMeta(data as { url?: string; title?: string });
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Action failed');
        return false;
      } finally {
        setSessionBusy(false);
      }
    },
    [sessionId, applyMeta],
  );

  const goBack = () => runSessionAction('/back');
  const goForward = () => runSessionAction('/forward');
  const refresh = () => runSessionAction('/reload');

  const handleGo = () => {
    const target = normalizeUrl(urlInput);
    if (!target) return;
    runSessionAction('/goto', { url: target });
  };

  // Click forwarding
  const handlePreviewClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId || phase === 'comparing' || sessionBusy) return;
    const pt = clientToViewport(e);
    if (!pt) return;
    setSessionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/browser/session/${sessionId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pt),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Click failed');
      }
      const data = await res.json().catch(() => ({}));
      applyMeta(data as { url?: string; title?: string });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Click failed');
    } finally {
      setSessionBusy(false);
    }
  };

  // Scroll forwarding — debounced to avoid flooding the server
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!sessionId || phase === 'comparing' || !previewImgRef.current) return;
      e.preventDefault();

      const img = previewImgRef.current;
      const rect = img.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const vp = imgToViewport(img, centerX, centerY);

      pendingScroll.current.deltaX += e.deltaX;
      pendingScroll.current.deltaY += e.deltaY;
      pendingScroll.current.x = vp.x;
      pendingScroll.current.y = vp.y;

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        const { x, y, deltaX, deltaY } = pendingScroll.current;
        pendingScroll.current = { deltaX: 0, deltaY: 0, x: 640, y: 400 };
        fetch(`/api/browser/session/${sessionId}/scroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, deltaX, deltaY }),
        }).catch(() => {});
      }, 80);
    },
    [sessionId, phase],
  );

  // Keyboard forwarding
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!sessionId || phase === 'comparing') return;
      // Don't intercept browser shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't intercept URL bar focus
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const mapped: Record<string, string> = {
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        Tab: 'Tab',
        Enter: 'Enter',
        Escape: 'Escape',
        Backspace: 'Backspace',
        Delete: 'Delete',
        Home: 'Home',
        End: 'End',
        PageUp: 'PageUp',
        PageDown: 'PageDown',
        ' ': 'Space',
      };

      const key = mapped[e.key];
      if (key) {
        e.preventDefault();
        fetch(`/api/browser/session/${sessionId}/key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        }).catch(() => {});
      } else if (e.key.length === 1) {
        // Printable character
        fetch(`/api/browser/session/${sessionId}/key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '', text: e.key }),
        }).catch(() => {});
      }
    },
    [sessionId, phase],
  );

  const handleCompare = async () => {
    if (!designFile || !sessionId) return;
    setPhase('comparing');
    setError(null);
    setLoadingStatus(
      `Resizing browser to ${designDimensions?.width}×${designDimensions?.height} and comparing…`,
    );

    try {
      const formData = new FormData();
      formData.append('designImage', designFile);
      formData.append('sessionId', sessionId);
      if (figmaSourceUrl) formData.append('figmaSource', figmaSourceUrl);

      const res = await fetch('/api/compare', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Comparison failed');
      }

      const report = (await res.json()) as { id?: string };
      if (!report.id) {
        throw new Error('Comparison finished but no report was returned');
      }

      setLoadingStatus('Comparison complete — opening report…');
      setCompletedReportId(report.id);
      sessionStorage.setItem('designlens:lastReport', report.id);
      setSessionId(null);

      // Hard navigation avoids losing the report when Next.js dev HMR reloads mid-route.
      window.location.assign(`/report/${report.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('navigate');
    }
  };

  // ── NAVIGATE / COMPARING ──
  if (phase === 'navigate' || phase === 'comparing') {
    const uiBusy = sessionBusy || sessionBootstrapping;

    return (
      <div className="h-screen flex flex-col bg-slate-100">
        {/* Browser chrome toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2.5 shrink-0 z-20">
          <button
            onClick={handleBackToSetup}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-white" />
            </div>
          </button>

          <div className="w-px h-6 bg-slate-200 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => goBack()}
              disabled={uiBusy || phase === 'comparing'}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goForward()}
              disabled={uiBusy || phase === 'comparing'}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => refresh()}
              disabled={uiBusy || phase === 'comparing'}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Reload"
            >
              <RotateCw className={`w-4 h-4 ${sessionBusy ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 flex items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Globe className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGo()}
              className="flex-1 px-2 py-1.5 bg-transparent text-sm outline-none"
              spellCheck={false}
              disabled={phase === 'comparing'}
            />
            <button
              onClick={handleGo}
              disabled={uiBusy || phase === 'comparing'}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border-l border-slate-200 transition-colors disabled:opacity-50"
            >
              Go
            </button>
          </div>

          <button
            onClick={handleCompare}
            disabled={phase === 'comparing' || !sessionId || uiBusy}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            {phase === 'comparing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing&hellip;
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                Compare This Screen
              </>
            )}
          </button>
        </div>

        {/* Info strip */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-sm shrink-0">
          <div className="flex items-center gap-2 text-indigo-700 min-w-0">
            <MousePointer2 className="w-4 h-4 shrink-0" />
            <p className="truncate">
              <span className="font-semibold">Live headless browser</span>
              {pageTitle ? <> &mdash; <span className="font-medium">{pageTitle}</span></> : null}
              . Click or scroll the preview; use keyboard arrow keys to navigate.
            </p>
          </div>
          <p className="text-indigo-500 shrink-0 ml-4 text-xs">
            {PREVIEW_W}&times;{PREVIEW_H} &middot; {designFile?.name}
          </p>
        </div>

        {/* Error strip */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Preview area — focus wrapper for keyboard forwarding */}
        <div
          ref={previewWrapperRef}
          className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-6 outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          onClick={() => previewWrapperRef.current?.focus()}
        >
          {sessionBootstrapping && !previewSrc && phase !== 'comparing' && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">
                Starting headless browser and loading page&hellip;
              </p>
            </div>
          )}

          {previewSrc && (
            <div className="relative max-w-full">
              {sessionBusy && phase !== 'comparing' && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl gap-2 pointer-events-none">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-600">Updating page&hellip;</p>
                </div>
              )}

              {phase === 'comparing' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-slate-700">{loadingStatus}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Using the same browser session you navigated in
                  </p>
                  {completedReportId && (
                    <a
                      href={`/report/${completedReportId}`}
                      className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      View Report
                    </a>
                  )}
                </div>
              )}

              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-300 bg-white">
                <div className="bg-slate-200 px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-500 truncate ml-2">
                    {currentUrl || '…'}
                  </div>
                </div>
                <img
                  ref={previewImgRef}
                  src={previewSrc}
                  alt="Live headless browser view"
                  className="block w-full max-w-[min(100vw-3rem,1280px)] cursor-crosshair object-contain bg-slate-900/5"
                  style={{ maxHeight: 'calc(100vh - 240px)' }}
                  draggable={false}
                  onClick={handlePreviewClick}
                />
              </div>
            </div>
          )}

          {!previewSrc && phase === 'comparing' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-lg font-medium text-slate-700">{loadingStatus}</p>
              {completedReportId && (
                <a
                  href={`/report/${completedReportId}`}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  View Report
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SETUP ──
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">DesignLens</h1>
            <p className="text-xs text-slate-500">Visual Design Comparison</p>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">Compare Designs to Implementations</h2>
          <p className="text-lg text-indigo-200 max-w-2xl mx-auto">
            Upload your UI mockup, open a live headless browser session, click through to
            the right screen, then compare.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 -mt-8 pb-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Design upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Design reference
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setDesignSource('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      designSource === 'upload'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesignSource('figma')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      designSource === 'figma'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Figma className="w-4 h-4" />
                    Figma frame
                  </button>
                </div>

                {designSource === 'upload' ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50'
                      : designPreview
                        ? 'border-slate-300 bg-slate-50'
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  {designPreview && !figmaSourceUrl ? (
                    <div className="p-4">
                      <img
                        src={designPreview}
                        alt="Design preview"
                        className="w-full rounded-lg max-h-72 object-contain"
                      />
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{designFile?.name}</span>
                        <button onClick={clearDesign} className="ml-auto text-slate-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 px-6 text-center">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600">Drag & drop your design mockup</p>
                      <p className="text-xs text-slate-400 mt-1">or click to browse — PNG, JPG, WebP</p>
                    </div>
                  )}
                </div>
                ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://www.figma.com/design/...?node-id=1-2"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleLoadFigma}
                    disabled={figmaLoading || !figmaUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold"
                  >
                    {figmaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Figma className="w-4 h-4" />}
                    {figmaLoading ? 'Loading frame…' : 'Load from Figma'}
                  </button>
                  <p className="text-xs text-slate-400">
                    Requires FIGMA_ACCESS_TOKEN on the server. Copy the frame link from Figma (Share → Copy link).
                  </p>
                  {designPreview && figmaSourceUrl && (
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                      <img src={designPreview} alt="Figma frame" className="w-full rounded-lg max-h-72 object-contain" />
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="truncate">Figma frame loaded</span>
                        <button onClick={clearDesign} className="ml-auto text-slate-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>

              <div className="space-y-6">
                {/* URL input */}
                <div>
                  <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-3">
                    Staging / Dev URL
                  </label>
                  <input
                    id="url"
                    type="url"
                    placeholder="https://staging.example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoadPreview()}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Opens in a server-side Playwright session (1280&times;800). You&apos;ll click through in the live preview.
                  </p>
                </div>

                {/* Capture size — matches uploaded design */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Screenshot size
                  </label>
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
                    {designDimensions ? (
                      <>
                        <p className="text-sm font-medium text-indigo-900">
                          Build captured at {designDimensions.width}×{designDimensions.height}px
                        </p>
                        <p className="text-xs text-indigo-700 mt-1.5 leading-relaxed">
                          The live page viewport is resized to match your uploaded design exactly —
                          no scaling or letterboxing. Scroll the page in the preview so it matches
                          your mockup before comparing.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-indigo-800">
                        Upload a design to set the capture dimensions automatically.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadPreview}
                disabled={!canPreview}
                className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm"
              >
                <Globe className="w-4 h-4" />
                Open Live Headless Preview
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-center text-lg font-bold text-slate-800 mb-8">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { step: '1', title: 'Upload Design', desc: 'Drop your Figma export, screenshot, or any mockup image.' },
              { step: '2', title: 'Live session', desc: 'A real Chromium session on the server — click links, scroll, use keyboard, or type a URL.' },
              { step: '3', title: 'Compare', desc: 'The build is captured at your design\'s exact pixel dimensions — same width, same height, pixel-for-pixel.' },
              { step: '4', title: 'Review & Fix', desc: 'Pixel diffs, overlays, annotated regions, and downloadable ZIP.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
