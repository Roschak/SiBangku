FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/control-api/package.json ./packages/control-api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/control-api ./packages/control-api

RUN pnpm --filter @sibangku/shared build
RUN pnpm --filter @sibangku/db build
RUN pnpm --filter @sibangku/control-api build

RUN pnpm --filter @sibangku/control-api deploy /prod/control-api --prod

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /prod/control-api ./

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
