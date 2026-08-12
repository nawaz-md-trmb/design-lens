# Deploy DesignLens on Render

Repo: https://github.com/nawaz-md-trmb/design-lens

## Deploy (about 5 minutes)

### 1. Connect GitHub to Render

1. Open **[dashboard.render.com](https://dashboard.render.com)**
2. Sign up / sign in → connect your **GitHub** account
3. Authorize Render to access repositories

### 2. Create from Blueprint

1. Click **New +** → **Blueprint**
2. Find and select **`nawaz-md-trmb/design-lens`**
3. Render reads `render.yaml` and shows:
   - Web service **designlens** (Docker)
   - 5GB disk on `/app/public` (report images persist)
4. Click **Apply** (or **Create Blueprint**)

### 3. Wait for the first deploy

- **Logs** tab — build takes ~5–10 min (Playwright Docker image is large)
- Status should become **Live**

### 4. Open your app

Render gives a URL like:

`https://designlens.onrender.com`

Test health:

```bash
curl https://designlens.onrender.com/api/health
```

Expected: `{"status":"ok","checks":{"app":"ok"},...}`

### 5. Optional environment variables

**Environment** tab → add from `.env.example`:

| Variable | Purpose |
|----------|---------|
| `FIGMA_ACCESS_TOKEN` | Import from Figma URLs |
| `DESIGNLENS_API_KEY` | CI compare API |
| `JIRA_*` / `ADO_*` | Ticket attachments |

Save → Render redeploys automatically.

---

## After deploy

1. Open your Render URL in a browser
2. Upload a design mockup
3. Enter staging URL → **Open Live Headless Preview**
4. Navigate to the right page → **Compare**

---

## Auto-deploy

Every push to `main` on GitHub triggers a new Render deploy (`autoDeploy: true` in `render.yaml`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check **Logs** — often Docker memory; retry deploy |
| Free/starter spins down | First request after idle may be slow (cold start) |
| Reports missing after deploy | Confirm disk is mounted at `/app/public` in service settings |
| Compare timeout | Large designs take longer; upgrade plan or reduce image size |

---

## Local alternative

```bash
docker compose up --build
```

See [HOSTING.md](./HOSTING.md).
