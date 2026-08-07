# DesignLens

Compare UI/UX designs against developer implementations. Find visual discrepancies across viewports.

## Quick Start

```bash
# Install dependencies
npm install

# Install browser for screenshots
npm run setup

# Start dev server (always runs on port 3100)
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

To stop: `npm run stop`. To see all project ports: `node ~/.config/dev-ports/list.mjs`.

## How It Works

1. **Upload** a design mockup (PNG, JPG, WebP)
2. **Enter** your staging/preview URL
3. **Select** viewports to test (Desktop, iPad, iPhone, etc.)
4. **Compare** — the tool captures screenshots via Playwright, runs pixel-level diffing, and produces an annotated report

## Report Features

- **Side by Side** — design and implementation next to each other
- **Overlay Slider** — drag to reveal design vs implementation
- **Diff Heatmap** — pixel differences highlighted with region annotations
- **Match Score** — per-viewport percentage showing how close the implementation is to the design
- **Issue Regions** — grid-based detection of areas with significant visual differences

## Tech Stack

- **Next.js 14** (App Router)
- **Playwright** — headless browser screenshots at any viewport
- **pixelmatch** — perceptual pixel comparison
- **sharp** — image resizing and normalization
- **Tailwind CSS** — UI styling

## Supported Viewports

| Device | Resolution |
|--------|-----------|
| Desktop | 1440 x 900 |
| Laptop | 1280 x 800 |
| iPad Landscape | 1194 x 834 |
| iPad Portrait | 834 x 1194 |
| iPhone 15 Pro | 393 x 852 |
| Android (Pixel 7) | 412 x 915 |
