# Deploy DesignLens on Railway

Repo: https://github.com/nawaz-md-trmb/design-lens

## One-time setup (~3 minutes)

### 1. Create Railway project from GitHub

1. Open **[railway.app/new/github](https://railway.app/new/github)**
2. Sign in with GitHub if prompted → authorize Railway
3. Select repository: **`nawaz-md-trmb/design-lens`**
4. Railway detects `Dockerfile` + `railway.toml` and starts building

### 2. Add persistent storage (reports)

1. Click the **design-lens** service
2. **Settings** → scroll to **Volumes**
3. **Add Volume**
   - Mount path: `/app/public`
   - Size: 5 GB (default is fine)
4. Redeploy if prompted (Railway may restart the service)

### 3. Public URL

1. **Settings** → **Networking** → **Generate Domain**
2. Copy your URL, e.g. `https://design-lens-production-xxxx.up.railway.app`

### 4. Environment variables (optional)

**Variables** tab → add any from `.env.example`:

| Variable | When needed |
|----------|-------------|
| `FIGMA_ACCESS_TOKEN` | Figma frame import |
| `DESIGNLENS_API_KEY` | CI compare API |
| `JIRA_*` / `ADO_*` | Ticket attachments |

### 5. Verify

```bash
curl https://YOUR-DOMAIN.up.railway.app/api/health
# → {"status":"ok","checks":{"app":"ok"},...}
```

Open the same URL in a browser → upload design → compare.

---

## Auto-deploy on git push (optional)

After the project exists on Railway:

1. Railway → project → **Settings** → copy **Project ID**
2. Service → **Settings** → copy **Service ID**
3. Railway → account → **Tokens** → create **Project token** (production env)
4. GitHub repo → **Settings** → **Secrets** → **Actions** → add:
   - `RAILWAY_TOKEN` = project token
   - `RAILWAY_PROJECT_ID` = project id
   - `RAILWAY_SERVICE_ID` = service id

Pushes to `main` will deploy via `.github/workflows/railway-deploy.yml`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Playwright | Dockerfile uses official Playwright image — should work; check build logs |
| Reports disappear | Add volume at `/app/public` |
| Compare times out | Railway starter plan — upgrade or use smaller design images |
| Health 503 | Wait for deploy to finish; check **Deployments** tab |
