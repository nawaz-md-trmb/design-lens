# DesignLens hosting

Repo: https://github.com/nawaz-md-trmb/design-lens

Use **Docker** — not Vercel or serverless. DesignLens needs Playwright, long compares, and disk for report images.

---

## Recommended: Render (GitHub → one click)

Uses `render.yaml` in this repo.

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub → select **`nawaz-md-trmb/design-lens`**
3. Render creates a Docker web service + **5GB disk** on `/app/public`
4. **Environment** tab → add secrets from `.env.example` (optional):
   - `FIGMA_ACCESS_TOKEN`
   - `DESIGNLENS_API_KEY`
   - Jira / Azure DevOps vars
5. Copy your service URL from the dashboard
6. Verify: `curl https://YOUR-SERVICE.onrender.com/api/health`

Auto-deploys on every push to `main`.

---

## Local or internal server (Docker)

No external host — runs on your machine or company VM:

```bash
docker compose up --build
# → http://localhost:3000
```

Production on a server:

```bash
docker build -t design-lens .
docker run -d -p 3000:3000 \
  -v designlens-data:/app/public \
  --name design-lens \
  --restart unless-stopped \
  design-lens
```

Health: `curl http://localhost:3000/api/health`

---

## Azure (Trimble / enterprise)

Same `Dockerfile` on **Azure Container Apps** or **App Service (Linux container)**:

1. Build image → push to Azure Container Registry
2. Deploy container with port **3000**
3. Mount Azure Files at **`/app/public`** for report persistence
4. Health probe: **`/api/health`**
5. Env vars from `.env.example`

---

## Why not Vercel?

Blocked or unsuitable for this app — serverless timeouts, no sticky browser sessions, ephemeral disk.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `FIGMA_ACCESS_TOKEN` | Import frames from Figma URLs |
| `DESIGNLENS_API_KEY` | CI compare API (`/api/ci/compare`) |
| `JIRA_*` | Attach reports to Jira tickets |
| `ADO_*` | Attach reports to Azure DevOps work items |

See `.env.example` for the full list.
