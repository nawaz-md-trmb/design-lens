# DesignLens hosting (Vercel not required)

## Recommended: Railway

Best fit for Playwright screenshots, live browser preview, and persistent reports.

### Deploy in ~5 minutes

1. **Push to GitHub**:

   ```bash
   # Personal GitHub
   ./scripts/publish-github.sh

   # Or Trimble / company org (create empty repo on GitHub first)
   ./scripts/publish-github.sh trimble

   # GitHub Enterprise (e.g. Trimble internal)
   GITHUB_HOST=github.trimble.com ./scripts/publish-github.sh YOUR_ORG
   ```

   Manual alternative:

   ```bash
   git remote add origin https://github.com/YOUR_ORG/design-lens.git
   git push -u origin main
   ```

2. **Railway** → [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo** → select `design-lens`

3. Railway reads `Dockerfile` + `railway.toml` automatically.

4. **Add a volume** (Settings → Volumes):
   - Mount path: `/app/public`
   - Keeps report images across restarts

5. **Environment variables** (optional — see `.env.example`):
   - `FIGMA_ACCESS_TOKEN`
   - `DESIGNLENS_API_KEY`
   - Jira / Azure DevOps vars for ticket attach

6. **Generate domain**: Settings → Networking → Generate domain

7. **Verify**: `curl https://YOUR-DOMAIN.up.railway.app/api/health`

---

## Alternative: Render

Uses `render.yaml` in this repo.

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect GitHub repo
3. Render creates the web service + 5GB disk on `/app/public`
4. Add secrets in the dashboard (`FIGMA_ACCESS_TOKEN`, etc.)

---

## Local / internal server (Docker)

No third-party hosting — runs entirely on your network:

```bash
docker compose up --build
# → http://localhost:3000
```

Reports persist in the `report-data` Docker volume.

For production on a VM:

```bash
docker build -t design-lens .
docker run -d -p 3000:3000 -v designlens-data:/app/public --name design-lens design-lens
```

---

## Why not Vercel?

DesignLens needs a **long-running Chromium process**, **multi-minute compares**, and **disk for report images**. Serverless platforms (Vercel, Netlify Functions) are a poor fit. Docker hosts (Railway, Render, Azure Container Apps, internal K8s) are the right model.

---

## Azure (Trimble / enterprise)

Same `Dockerfile` works on **Azure Container Apps** or **App Service (Linux container)**:

- Image: build from `Dockerfile` or GitHub Actions → ACR
- Mount Azure Files at `/app/public` for report persistence
- Set env vars from `.env.example`
- Health probe: `/api/health`

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `FIGMA_ACCESS_TOKEN` | Import frames from Figma URLs |
| `DESIGNLENS_API_KEY` | CI compare API (`/api/ci/compare`) |
| `JIRA_*` | Attach reports to Jira tickets |
| `ADO_*` | Attach reports to Azure DevOps work items |

See `.env.example` for full list.
