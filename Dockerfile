# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install ALL dependencies (including devDeps for the build)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build Next.js
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime image with Playwright Chromium pre-installed
#
# We use the official Playwright image (Jammy/Ubuntu 22.04) which bundles
# Chromium + all required system libraries. Both the web server and the
# BullMQ worker run from this same image — only the CMD differs.
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user that matches the Next.js recommendation
RUN groupadd --system --gid 1001 nodejs && \
    useradd  --system --uid 1001 --gid nodejs nextjs

# Copy built artifacts
COPY --from=builder --chown=nextjs:nodejs /app/.next           ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/src             ./src
COPY --from=builder --chown=nextjs:nodejs /app/node_modules    ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json    ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

# Ensure runtime write directories exist and are owned by nextjs
RUN mkdir -p public/reports public/ci-runs && \
    chown -R nextjs:nodejs public/reports public/ci-runs

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ── Default: run the Next.js web server ───────────────────────────────────────
# Override CMD to "npm run worker" for the BullMQ worker service.
CMD ["npm", "run", "start"]
