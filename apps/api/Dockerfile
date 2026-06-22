FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS dev
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc* pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install
COPY . .
ENV NODE_PATH=/app/node_modules
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma
EXPOSE 3001
CMD ["sh", "-c", "cd apps/api && NODE_PATH=/app/node_modules PATH=/app/node_modules/.bin:$PATH tsx watch src/main.ts"]

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc* pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NODE_PATH=/app/node_modules
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma
RUN cd apps/api && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
