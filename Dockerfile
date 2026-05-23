# ─────────────────────────────────────────────────────
  #  Lucifer Bot v3.1.0 — Railway Dockerfile
  #  Bypasses pnpm/railpack auto-detection entirely
  # ─────────────────────────────────────────────────────
  FROM node:20-bullseye-slim

  # Native deps for canvas / better-sqlite3
  RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make gcc g++ \
      libcairo2-dev libpango1.0-dev libpng-dev libjpeg-dev \
      libgif-dev librsvg2-dev libpixman-1-dev uuid-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

  WORKDIR /app

  # Copy only bot/ folder
  COPY bot/package.json ./package.json
  COPY bot/scripts/ ./scripts/

  # Install dependencies
  RUN npm install --legacy-peer-deps

  # Copy rest of bot
  COPY bot/ .

  # Expose dashboard port
  EXPOSE 5000

  # Health check
  HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||5000) + '/api/ping', r => r.statusCode===200 ? process.exit(0) : process.exit(1)).on('error',()=>process.exit(1))"

  CMD ["sh", "start.sh"]
  