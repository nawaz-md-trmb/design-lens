# DesignLens hosting guide

## Recommended: Railway (Docker)

Best for **Playwright browser sessions**, **long compare runs**, and **persistent reports**.

1. Push this repo to GitHub
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Railway uses `Dockerfile` + `railway.toml` automatically
4. Add a **Volume** mounted at `/app/public/reports` (optional but recommended)
5. Set env vars from `.env.example` as needed

Health check: `GET /api/health`

---

## Alternative: Docker / docker-compose

```bash
docker compose up --build
# → http://localhost:3000
```

Reports persist in the `report-data` volume.

---

## Vercel (preview / light use)

**Production URL:** https://design-lens-rho.vercel.app

Vercel works for the UI and API, but serverless has limits:

| Feature | Vercel | Railway/Docker |
|--------|--------|----------------|
| Playwright screenshots | Works (with cache path) | Full support |
| Live browser preview | Limited (no sticky sessions) | Full support |
| Report persistence | **Vercel Blob** (required) | Local disk / volume |
| Compare timeout | 60s max | No practical limit |

### Vercel Blob setup (required for reports)

1. Vercel dashboard → your project → **Storage** → **Create Blob Store**
2. Connect it to the project (injects `BLOB_READ_WRITE_TOKEN`)
3. Redeploy

Without Blob, reports are lost after each serverless invocation.

### Redeploy Vercel

```bash
npx vercel deploy --prod --yes
```

---

## Environment variables

See `.env.example` for Figma, CI API key, Jira, and Azure DevOps settings.
