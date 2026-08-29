# FASE 9: CLI Tool

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-29  
**Terakhir Update:** 2026-08-29T19:10:00+07:00

## Yang Sudah Dikerjakan

### CLI Tool (FASE 9)
- [x] Implemented fully-functional Commander-based CLI tool entry (`packages/cli/src/index.ts`):
  - [x] Auto-login helper to retrieve JWT Admin token on the fly from the Control Plane API using email and password defaults, or environment variables.
  - [x] Command `sibangku tenant create` to provision databases, owners, and branding configurations.
  - [x] Command `sibangku tenant list` to print active, trial, and suspended nodes in a formatted terminal table.
  - [x] Command `sibangku tenant inspect <tenant_id>` to print full JSON metadata configuration details.
  - [x] Command `sibangku tenant suspend <tenant_id>` to set tenant operational status to suspended.
  - [x] Command `sibangku tenant activate <tenant_id>` to reactivate a suspended node.
  - [x] Command `sibangku tenant extend-trial <tenant_id> --days <days>` to extend trial counts.
  - [x] Command `sibangku tenant destroy <tenant_id>` to completely drop database, purge subscriptions, and destroy configurations (incorporating DESTROY confirmation safety check triggers).
- [x] Cast JSON payload parses to `any` to comply with strict TS typecheck rules.
- [x] Verified cli package builds cleanly.

## Yang Belum / Selanjutnya
- [ ] FASE 10: Worker & Background Jobs (Trial expiry checker cron, Whatsapp dispatch jobs)
- [ ] FASE 11: Docker & Deployment
- [ ] FASE 12: Testing
- [ ] FASE 13: Documentation
- [ ] FASE 14: Final Audit

## Keputusan Arsitektur
1. **Stateless API Interactions**: CLI acts as an API client to `control-api`, avoiding codebase duplication of provisioning logic and database connection configurations.
2. **On-the-Fly Token Retrieval**: The CLI leverages automatic login using admin credentials, providing a seamless user experience.
3. **Strict Validation Purging**: The destroy command executes complete database removal, which requires exact confirmation validation matching PRD requirements.
