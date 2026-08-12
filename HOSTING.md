# DesignLens hosting (free / self-hosted)

Render, Railway, and similar platforms charge for **Docker + persistent disk + Playwright** — DesignLens needs all three. The free path is to **run it yourself** (your Mac, a company VM, or any server with Docker).

---

## Option 1: Local dev (free, fastest)

Best for day-to-day use on your machine:

```bash
cd design-lens
npm install
npm run setup          # Playwright Chromium (once)
npm run dev            # http://localhost:3100
```

Reports save to `public/reports/` on your disk — they persist between runs.

---

## Option 2: Docker on your machine (free, production-like)

Same as a server deploy, but runs locally:

```bash
docker compose up --build
```

Open **http://localhost:3000**

Reports persist in the Docker volume `report-data`.

Stop: `docker compose down`  
Start again: `docker compose up` (data kept in volume)

---

## Option 3: Company VM or any Linux server (free if you have the box)

If Trimble (or your team) gives you a small VM:

```bash
git clone https://github.com/nawaz-md-trmb/design-lens.git
cd design-lens
docker compose up --build -d
```

Share with teammates via the VM’s internal URL, e.g. `http://your-vm.internal:3000`

For HTTPS or external access, put **nginx** or your company ingress in front — ask IT.

---

## Option 4: Run on your Mac and share with the team (free)

Keep DesignLens running on your machine:

```bash
docker compose up --build
```

Share access via:

- **Same office network** — others use `http://YOUR-MAC-IP:3000`
- **Tailscale / company VPN** — if your org uses it
- **Do not use ngrok/public tunnels** for staging URLs with real product data unless IT approves

---

## What we do NOT recommend (paid or blocked)

| Platform | Why skip |
|----------|----------|
| **Vercel** | Blocked at your org; bad fit for Playwright |
| **Render** | Persistent disk + Docker = paid plan |
| **Railway** | Paid for production Docker workloads |

---

## Environment variables (optional)

Copy `.env.example` → `.env.local` for local dev, or set in `docker-compose.yml`:

- `FIGMA_ACCESS_TOKEN` — Figma import
- `DESIGNLENS_API_KEY` — CI API
- Jira / Azure DevOps — ticket attach

---

## Azure (if Trimble provides it)

If your org uses Azure internally (not a personal subscription), the same `Dockerfile` runs on **Container Apps** or **App Service** with a file share at `/app/public`. That’s an internal IT request, not a personal paid SaaS.

---

## Quick comparison

| Method | Cost | Reports persist | Share with team |
|--------|------|-----------------|-----------------|
| `npm run dev` | Free | Yes (local folder) | No (localhost only) |
| `docker compose` | Free | Yes (volume) | Same network / VPN |
| Company VM | Free* | Yes | Yes (internal URL) |

\*If your org already provides the server.
