# Share DesignLens with testers (free)

## GitHub (code)

**https://github.com/nawaz-md-trmb/design-lens**

Clone and run locally:

```bash
git clone https://github.com/nawaz-md-trmb/design-lens.git
cd design-lens
npm install && npm run setup && npm run dev
```

Open **http://localhost:3100** (or your assigned dev port).

---

## Live URL for others (free tunnel — recommended for demos)

While DesignLens runs on your machine, expose it with **Cloudflare Tunnel** (no account needed for quick tunnels):

```bash
# Terminal 1 — app (pick one)
npm run dev                    # http://localhost:3100
# or
docker compose up --build      # http://localhost:3000

# Terminal 2 — public URL (match the port above)
npx cloudflared tunnel --url http://localhost:3100
```

Cloudflared prints a **`https://….trycloudflare.com`** URL — share that with QA/designers.

**Notes:**

- The tunnel stops when you close Terminal 2 or stop the app.
- Your Mac must stay on and the app running.
- Do not tunnel production/staging URLs with real customer data unless IT approves.

---

## Docker on a team VM (persistent internal URL)

If you have a Linux server or company VM:

```bash
git clone https://github.com/nawaz-md-trmb/design-lens.git
cd design-lens
docker compose up --build -d
```

Share **`http://<vm-hostname>:3000`** on VPN or office network.

---

## Fly.io (paid cloud — optional)

Playwright needs **~2GB RAM**. Fly’s free 256MB tier is too small.

If you have a Fly account and budget:

```bash
fly auth login
fly apps create design-lens   # once
fly volumes create report_data --size 1 --region sin
fly deploy
```

See [`fly.toml`](./fly.toml). Expect ~$5–15/mo for a small always-on machine.

---

## Not available (your constraints)

| Platform | Status |
|----------|--------|
| Vercel | Blocked at org; no Playwright |
| Render / Railway | Paid for Docker + disk |

See [HOSTING.md](./HOSTING.md) for full details.
