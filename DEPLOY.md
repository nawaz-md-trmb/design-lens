# Deploying DesignLens

> **Current guide:** see **[HOSTING.md](./HOSTING.md)** for Render (recommended) and Docker deploy.
> The Railway sections below are legacy and not recommended.

## Legacy: Railway (3 services — web + worker + Redis)

Railway is the easiest host for this architecture because it natively supports
multiple services from the same repo, has a managed Redis plugin, and handles
Docker builds automatically.

---

### 1. Push to GitHub

```bash
git init          # if not already a git repo
git add .
git commit -m "feat: DesignLens initial commit"
gh repo create your-org/design-lens --public --push
```

---

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select `your-org/design-lens`
3. Railway auto-detects the `Dockerfile` — confirm and deploy
4. Once the first deploy finishes, note the generated domain (e.g. `design-lens.up.railway.app`)

---

### 3. Add Redis

Inside the Railway project:

1. Click **+ New** → **Database** → **Add Redis**
2. Click the Redis service → **Connect** tab
3. Copy the `REDIS_URL` value — you'll paste it into the web service env vars

---

### 4. Set environment variables on the web service

Click the web service → **Variables** → add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.up.railway.app` |
| `REDIS_URL` | *(paste from Redis Connect tab)* |
| `GITHUB_APP_ID` | *(from GitHub App settings)* |
| `GITHUB_APP_PRIVATE_KEY` | *(single-line PEM from GITHUB_APP_SETUP.md step 2)* |
| `GITHUB_APP_WEBHOOK_SECRET` | *(the secret you chose)* |
| `GITHUB_CLIENT_ID` | *(from GitHub App OAuth section)* |
| `GITHUB_CLIENT_SECRET` | *(generated in GitHub App OAuth section)* |
| `DESIGNLENS_API_KEY` | `openssl rand -hex 32` |

---

### 5. Add the worker service

The worker runs from the **same Docker image** but with a different start command.

1. In the Railway project → **+ New** → **GitHub Repo** → same repo
2. Railway will detect the Dockerfile again
3. Go to the new service → **Settings** → **Start Command**:
   ```
   npm run worker
   ```
4. Add the **same environment variables** as the web service (the worker needs
   Redis URL + GitHub credentials to post check run updates)
5. **No port** needed — the worker is not a web server

---

### 6. Add a volume for report storage (optional but recommended)

By default, reports written to `public/reports/` and `public/ci-runs/` are
lost when the container restarts. To persist them:

1. Web service → **Volumes** → **+ New Volume**
2. Mount path: `/app/public/reports`
3. Repeat for `/app/public/ci-runs`

> For high traffic, consider switching to object storage (AWS S3 / Cloudflare R2)
> — replace `writeFile` calls in `src/lib/run-store.ts` and `src/app/api/compare/route.ts`.

---

### 7. Point the GitHub App webhook at your domain

In your GitHub App settings (github.com/settings/apps/YOUR-APP):

- **Webhook URL**: `https://your-domain.up.railway.app/api/github/webhook`
- **Webhook secret**: must match `GITHUB_APP_WEBHOOK_SECRET`

Hit **Save changes** → **Redeliver** on the latest ping to verify.

---

### 8. Verify

```bash
curl https://your-domain.up.railway.app/api/health
# → {"status":"ok","checks":{"app":"ok","redis":"ok"},...}
```

---

## Alternative: Render

Render supports background workers natively.

A `render.yaml` is included in the repo. To deploy:

1. Connect your GitHub repo to [render.com](https://render.com)
2. Render detects `render.yaml` and creates all three services automatically
3. Set secret environment variables in the Render dashboard
   (mark `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`,
   `DESIGNLENS_API_KEY` as **secret** in render.yaml or the dashboard)

---

## Local dev with Docker

```bash
# Build
docker build -t design-lens .

# Run web (needs Redis from docker-compose)
docker compose up -d  # starts Redis on :6379
docker run -p 3000:3000 --env-file .env.local design-lens

# Run worker (separate terminal)
docker run --env-file .env.local design-lens npm run worker
```

---

## Health check

`GET /api/health` — returns `200 ok` when healthy, `503 degraded` if Redis is unreachable.
Used by Railway and Render for deployment readiness checks.
