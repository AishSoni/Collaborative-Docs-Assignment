FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9

FROM base AS dev
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc* pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "cd apps/web && NODE_PATH=/app/node_modules PATH=/app/node_modules/.bin:$PATH next dev"]

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc* pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN cd apps/web && NODE_PATH=/app/node_modules PATH=/app/node_modules/.bin:$PATH next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
