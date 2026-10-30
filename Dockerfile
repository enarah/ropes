FROM node:26-bookworm-slim AS demo

# ROPES Demo / Integration Environment: development mode, not production.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run db:generate && chown -R node:node /app
USER node
ENV NODE_ENV=development ROPES_DEMO_MODE=true
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
