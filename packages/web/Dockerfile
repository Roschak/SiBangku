FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

RUN pnpm --filter @sibangku/shared build
RUN pnpm --filter @sibangku/web build

RUN pnpm --filter @sibangku/web deploy /prod/web --prod

FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app
COPY --from=builder /prod/web ./

EXPOSE 3000
ENV NODE_ENV=production
CMD ["pnpm", "start"]
