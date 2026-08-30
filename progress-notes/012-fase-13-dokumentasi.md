# FASE 13: Technical Documentation

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T17:18:00+07:00

## Yang Sudah Dikerjakan

### Technical Guides Created
We have created and populated a comprehensive technical documentation suite under the root `docs/` directory to ensure codebase maintainability and AI/developer readability (PRD §140, §183):

1.  **[CODE_STRUCTURE.md](file:///D:/sertifikat/Apk_SiBangku/docs/CODE_STRUCTURE.md)** — Detailed map of the monorepo packages, source files, and workspace layout.
2.  **[DOCKER.md](file:///D:/sertifikat/Apk_SiBangku/docs/DOCKER.md)** — Core container architectures, exposed ports, internal compose networking, and run commands.
3.  **[SECURITY.md](file:///D:/sertifikat/Apk_SiBangku/docs/SECURITY.md)** — Tenant database isolation mechanisms, JWT authentication scopes, password changes, and SQL injection prevention.
4.  **[TESTING.md](file:///D:/sertifikat/Apk_SiBangku/docs/TESTING.md)** — Setup guide for Vitest, package-specific commands, writing unit/integration assertions, and resolving native module issues.
5.  **[RESERVATION.md](file:///D:/sertifikat/Apk_SiBangku/docs/RESERVATION.md)** — Double-booking overlap mathematical formulas, Hono Postgres transaction hooks, check-out modes, and notification triggers.
6.  **[TABLE_LAYOUT.md](file:///D:/sertifikat/Apk_SiBangku/docs/TABLE_LAYOUT.md)** — Relative grid percentage coordinate structures for responsive displays, metadata formats, and bulk coordinates update.
7.  **[PAYMENT.md](file:///D:/sertifikat/Apk_SiBangku/docs/PAYMENT.md)** — Midtrans Snap API checkout overlay, webhook signature validations, and idempotent payment state transitions.
8.  **[MENU.md](file:///D:/sertifikat/Apk_SiBangku/docs/MENU.md)** — Menu categories and items database schemas, stock capacity checkers, and transaction-bound stock rollbacks.
9.  **[APK_BUILD.md](file:///D:/sertifikat/Apk_SiBangku/docs/APK_BUILD.md)** — Android WebView wrappers, dynamic branding asset replacements, and Gradle package compilation automation.
10. **[WEB_BUILD.md](file:///D:/sertifikat/Apk_SiBangku/docs/WEB_BUILD.md)** — Next.js 15 routing boundaries, host subdomain resolution, and dynamic body variables for CSS branding colors.
11. **[DEPLOYMENT.md](file:///D:/sertifikat/Apk_SiBangku/docs/DEPLOYMENT.md)** — Automated tenant database provisioners, programmatic database migrations, timezone seeds, and trial lifecycles.
12. **[OPERATIONS.md](file:///D:/sertifikat/Apk_SiBangku/docs/OPERATIONS.md)** — CLI administrative tool commands list, audit trail structure, and background worker loop checks.

## Yang Belum / Selanjutnya
- [ ] FASE 14: Final Audit (Verification of production readiness and final report generation)

## Keputusan Arsitektur
1.  **Segregated Markdown Documentation**: Housing documents in a root `docs/` folder ensures they are easy to locate, read, and maintain independently of the application logic.
2.  **Relative Link References**: Used absolute file link references matching standard guidelines to ensure the guides remain clickable inside development IDE contexts.
