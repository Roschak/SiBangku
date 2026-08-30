# FASE 11: Docker & Deployment

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T16:47:00+07:00

## Yang Sudah Dikerjakan

### Dockerfiles Created
- [x] `packages/control-api/Dockerfile` — Multi-stage image compiling dependencies and deploying with `pnpm deploy`.
- [x] `packages/tenant-api/Dockerfile` — Multi-stage image compiling dependencies and deploying with `pnpm deploy`.
- [x] `packages/worker/Dockerfile` — Multi-stage image compiling dependencies and deploying with `pnpm deploy`.
- [x] `packages/web/Dockerfile` — Next.js client & admin portal production runtime image using `pnpm start`.

### Docker Compose Configuration
- [x] Updated root `docker-compose.yml` to run:
  - `postgres` (control DB & init SQL)
  - `redis`
  - `control-api` (exposed port 3001)
  - `tenant-api` (exposed port 3002)
  - `worker` (background scheduler job runner)
  - `web` (exposed port 3000)

### Configurable Environments
- [x] Refactored `packages/web/src/app/utils/tenant.ts` to support `process.env.NEXT_PUBLIC_TENANT_API_URL` and `process.env.NEXT_PUBLIC_CONTROL_API_URL`.
- [x] Injected a global client-side `fetch` interceptor in the root `packages/web/src/app/layout.tsx` before React mount. It rewrites hardcoded `http://localhost:3001` or `http://localhost:3002` references to their corresponding environment variables dynamically, making the build fully transportable.

## Yang Belum / Selanjutnya
- [ ] FASE 12: Testing (Unit tests, endpoint assertions, database concurrency validation)
- [ ] FASE 13: Documentation
- [ ] FASE 14: Final Audit

## Keputusan Arsitektur
1. **pnpm deploy Standalone Bundling**: Multi-stage Docker builds build workspace packages (like `shared` and `db`) first, then use `pnpm deploy` to prune unnecessary development packages and generate lightweight standalone artifacts for the production environment.
2. **Global Fetch Interception**: Client-side fetch override interceptor resolves environmental addresses on the fly. This prevents rewriting every single page file containing hardcoded developer host addresses.
3. **Control-to-Tenant Host Injection**: Since tenant database connections parse `CONTROL_DATABASE_URL` credentials, configuring `postgres` as host automatically connects tenant APIs to the dynamic databases on the correct container network.
