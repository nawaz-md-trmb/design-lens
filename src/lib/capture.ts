import { chromium } from 'playwright';
import type { Viewport } from './types';
import { gotoResilient } from './browser-session';
import { configurePlaywrightEnv } from './playwright-env';

export async function captureScreenshot(
  url: string,
  viewport: Viewport,
  outputPath: string,
): Promise<void> {
  configurePlaywrightEnv();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await gotoResilient(page, url);
    await page.screenshot({ path: outputPath, fullPage: false });
    await context.close();
  } finally {
    await browser.close();
  }
}
