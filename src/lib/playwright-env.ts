/** Ensure Playwright finds Chromium in Vercel build cache and Docker images. */
export function configurePlaywrightEnv(): void {
  if (process.env.VERCEL === '1') {
    process.env.PLAYWRIGHT_BROWSERS_PATH =
      process.env.PLAYWRIGHT_BROWSERS_PATH || '/vercel/.cache/ms-playwright';
  }
}
