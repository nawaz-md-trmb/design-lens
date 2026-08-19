# DesignLens

Compare UI/UX designs against developer implementations. Find visual discrepancies with component-level reporting.

## Quick Start (local)

```bash
npm install
npm run setup          # Playwright Chromium
npm run dev            # http://localhost:3100
```

## Run DesignLens (free)

No paid cloud required — runs on your machine or a company VM:

```bash
npm install && npm run setup && npm run dev   # http://localhost:3100
# or
docker compose up --build                     # http://localhost:3000
```

See **[HOSTING.md](./HOSTING.md)** for sharing with your team on an internal server.

Paid hosts (Render, Railway) are **not required** and need paid plans for Docker + disk.

## How It Works

1. **Upload** a design mockup (PNG, JPG, WebP) — the comparison width follows your design
2. **Enter** your staging/preview URL and open a live browser session
3. **Compare** — capture the build at your design's width and diff it against the mockup
4. **Review** — component-level issues, pixel diffs, overlays, and a shareable QA report

## Report Features

- **Side by Side** — design and implementation next to each other
- **Overlay Slider** — drag to reveal design vs implementation
- **Diff Heatmap** — pixel differences highlighted with region annotations
- **Match Score** — percentage showing how close this snapshot is to the design
- **Issue Regions** — grid-based detection of areas with significant visual differences

## Tech Stack

- **Next.js 14** (App Router)
- **Playwright** — headless browser capture at your design's width
- **pixelmatch** — perceptual pixel comparison
- **sharp** — image resizing and normalization
- **Tailwind CSS** — UI styling

## Comparison frame

Upload sets the snapshot width automatically (e.g. a 1600px-wide export → 1600px-wide capture). DesignLens labels snapshots as **Desktop**, **Tablet**, or **Mobile** based on width. For CI with fixed breakpoints, see `VIEWPORTS` in [`src/lib/viewports.ts`](src/lib/viewports.ts).
