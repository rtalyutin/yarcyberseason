FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist/client ./dist/client
COPY --from=build --chown=node:node /app/scripts/server.mjs /app/scripts/dota-results-worker.mjs /app/scripts/dota-results-import.mjs ./scripts/
COPY --from=build --chown=node:node /app/worker/index.js ./worker/index.js
COPY --from=build --chown=node:node /app/src/lib/dota-import.js /app/src/lib/dota-results.js ./src/lib/
COPY --from=build --chown=node:node /app/src/data/tournaments/dota2-autumn-2026.json ./src/data/tournaments/dota2-autumn-2026.json
USER node
EXPOSE 8080
CMD ["node", "scripts/server.mjs"]
