import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import crypto from 'crypto';

export const PREVIEW_VIEWPORT = { width: 1280, height: 800 } as const;

const TTL_MS = 45 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `networkidle` often never fires on modern apps (analytics, websockets). Prefer load. */
export async function gotoResilient(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
  } catch {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch {
      await page.goto(url, { waitUntil: 'commit', timeout: 20_000 });
    }
  }
  await delay(400);
}

async function reloadResilient(page: Page): Promise<void> {
  try {
    await page.reload({ waitUntil: 'load', timeout: 45_000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  }
  await delay(400);
}

type Mutex = <T>(fn: () => Promise<T>) => Promise<T>;

function createMutex(): Mutex {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(() => fn());
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

export type BrowserSessionRecord = {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  mutex: Mutex;
  createdAt: number;
};

// ── Singleton session map — survives HMR in Next.js dev ──────────────────────
// We store on globalThis so the same Map is reused across hot-module reloads.

declare global {
  // eslint-disable-next-line no-var
  var __designLensSessions: Map<string, BrowserSessionRecord> | undefined;
  // eslint-disable-next-line no-var
  var __designLensSweepTimer: ReturnType<typeof setInterval> | undefined;
}

function getSessions(): Map<string, BrowserSessionRecord> {
  if (!globalThis.__designLensSessions) {
    globalThis.__designLensSessions = new Map();
  }
  return globalThis.__designLensSessions;
}

function ensureSweepTimer(): void {
  if (globalThis.__designLensSweepTimer) return;
  globalThis.__designLensSweepTimer = setInterval(() => {
    const now = Date.now();
    getSessions().forEach((_, id) => {
      const s = getSessions().get(id);
      if (s && now - s.createdAt > TTL_MS) {
        destroySession(id).catch(() => {});
      }
    });
  }, SWEEP_INTERVAL_MS);
  // Don't block process exit
  if (typeof globalThis.__designLensSweepTimer === 'object') {
    (globalThis.__designLensSweepTimer as NodeJS.Timeout).unref?.();
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createBrowserSession(
  startUrl: string,
): Promise<{ id: string; width: number; height: number }> {
  ensureSweepTimer();
  const sessions = getSessions();
  const id = crypto.randomUUID();
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { ...PREVIEW_VIEWPORT },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await gotoResilient(page, startUrl);

    const mutex = createMutex();
    sessions.set(id, { id, browser, context, page, mutex, createdAt: Date.now() });
    browser = undefined; // ownership transferred
    return { id, width: PREVIEW_VIEWPORT.width, height: PREVIEW_VIEWPORT.height };
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    throw e;
  }
}

export function getSession(id: string): BrowserSessionRecord | undefined {
  return getSessions().get(id);
}

export function listSessions(): Array<{ id: string; createdAt: number; url: string }> {
  const out: Array<{ id: string; createdAt: number; url: string }> = [];
  getSessions().forEach((s) => {
    out.push({ id: s.id, createdAt: s.createdAt, url: s.page.url() });
  });
  return out;
}

export async function destroySession(id: string): Promise<void> {
  const sessions = getSessions();
  const s = sessions.get(id);
  if (!s) return;
  // Remove from map first so new requests immediately get "not found",
  // then close inside the mutex to wait for any in-flight action to finish.
  sessions.delete(id);
  await s.mutex(async () => {
    await s.context.close().catch(() => {});
    await s.browser.close().catch(() => {});
  });
}

export async function sessionFramePng(id: string): Promise<Buffer> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(() => s.page.screenshot({ type: 'png', fullPage: false }));
}

/** Returns current url + title after the action (avoids a separate /meta round-trip). */
async function metaAfterAction(s: BrowserSessionRecord): Promise<{ url: string; title: string }> {
  return { url: s.page.url(), title: await s.page.title() };
}

export async function sessionClick(
  id: string,
  x: number,
  y: number,
): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(async () => {
    await s.page.mouse.click(x, y);
    await delay(400);
    return metaAfterAction(s);
  });
}

export async function sessionScroll(
  id: string,
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
): Promise<void> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  await s.mutex(async () => {
    await s.page.mouse.move(x, y);
    await s.page.mouse.wheel(deltaX, deltaY);
    await delay(80);
  });
}

export async function sessionKey(
  id: string,
  key: string,
  text?: string,
): Promise<void> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  await s.mutex(async () => {
    if (text) {
      await s.page.keyboard.type(text);
    } else {
      await s.page.keyboard.press(key);
    }
    await delay(80);
  });
}

export async function sessionGoto(
  id: string,
  url: string,
): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(async () => {
    await gotoResilient(s.page, url);
    return metaAfterAction(s);
  });
}

export async function sessionBack(
  id: string,
): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(async () => {
    await s.page
      .goBack({ waitUntil: 'load', timeout: 15_000 })
      .catch(() => s.page.goBack({ waitUntil: 'domcontentloaded', timeout: 10_000 }))
      .catch(() => {});
    await delay(400);
    return metaAfterAction(s);
  });
}

export async function sessionForward(
  id: string,
): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(async () => {
    await s.page
      .goForward({ waitUntil: 'load', timeout: 15_000 })
      .catch(() => s.page.goForward({ waitUntil: 'domcontentloaded', timeout: 10_000 }))
      .catch(() => {});
    await delay(400);
    return metaAfterAction(s);
  });
}

export async function sessionReload(
  id: string,
): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(async () => {
    await reloadResilient(s.page);
    return metaAfterAction(s);
  });
}

export async function sessionCurrentMeta(id: string): Promise<{ url: string; title: string }> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  return s.mutex(() => metaAfterAction(s));
}

export async function sessionScreenshotToFile(
  id: string,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const s = getSessions().get(id);
  if (!s) throw new Error('Session not found');
  await s.mutex(async () => {
    await s.page.setViewportSize({ width, height });
    await delay(500);
    await s.page.screenshot({ path: outputPath, fullPage: false });
    await s.page.setViewportSize({ ...PREVIEW_VIEWPORT });
    await delay(200);
  });
}
