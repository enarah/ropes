FROM node:26-bookworm-slim AS demo

# Compiled TrueNAS synthetic sandbox image; Argus uses its separate release path.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
# Prisma maintenance commands need OpenSSL detection on Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --chown=node:node . .
ENV NEXT_TELEMETRY_DISABLED=1
# No runtime database, authentication or demo settings are needed to build.
RUN npm run db:generate && npm run build && chown -R node:node /app
USER node
ENV NODE_ENV=production
# Sandbox/demo access is explicitly configured at runtime, never inferred from
# NODE_ENV and never enabled by an automatic seed/migration command.
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
