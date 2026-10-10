FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --omit=dev --prefix backend
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node backend/server.mjs backend/dota-results-worker.mjs backend/dota-results-import.mjs backend/dota-mvp-import.mjs ./backend/
COPY --chown=node:node src/lib/dota-import.js src/lib/dota-results.js src/lib/dota-mvp.js ./src/lib/
COPY --chown=node:node src/data/player-identities.json ./src/data/player-identities.json
COPY --chown=node:node src/data/tournaments/dota2-autumn-2026.json ./src/data/tournaments/dota2-autumn-2026.json
COPY --chown=node:node backend/organizer-api.mjs backend/organizer-assignments.json ./backend/
COPY --chown=node:node backend/captain-service.mjs backend/captain-auth.mjs backend/captain-store.mjs backend/captain-results-reader.mjs ./backend/
COPY --chown=node:node backend/captain-api.mjs backend/captain-cleanup-worker.mjs ./backend/
COPY --chown=node:node src/lib/organizer-table.js src/lib/community.js src/lib/tournament.js ./src/lib/
COPY --chown=node:node src/data/tournaments/*.json ./src/data/tournaments/
USER node
EXPOSE 8080
CMD ["node", "backend/server.mjs"]
