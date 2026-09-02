# Build context MUST be the repo root, not worker/ -- see worker/README.md. This image needs
# lib/marketplaces and lib/storage from the main app (they're plain, Prisma-free TS files, the
# same source the Next.js app imports, not a copy).
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

COPY worker/package.json worker/package-lock.json* ./
RUN npm install --omit=dev

# tsconfig.docker.json, not tsconfig.json -- see that file for why (Node's node_modules
# resolution needs lib/ to live inside WORKDIR here, unlike the sibling-directory layout that
# works locally).
COPY worker/tsconfig.docker.json ./tsconfig.json
COPY worker/src ./src
COPY lib/marketplaces ./lib/marketplaces
COPY lib/storage ./lib/storage

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npx", "tsx", "src/server.ts"]
