# C# FASE 5: Background Worker & Scheduler Loops

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T19:03:00+07:00

## Yang Sudah Dikerjakan

### Worker Bootstrap & DB Context
- [x] Updated [src/SiBangku.Worker/Program.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Worker/Program.cs):
  - Added environment configuration loading support.
  - Registered `ControlDbContext` database context mapping control plane operations.
  - Set up background hosted service configurations.

### Background Task Executions & Tenant Expirations
- [x] Created [src/SiBangku.Worker/Worker.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Worker/Worker.cs):
  - Inherits from `Microsoft.Extensions.Hosting.BackgroundService` to support background task loops.
  - Implements `CheckTrialExpirationsAsync` (Job 1) querying expired trial periods and updating tenant statuses to `TRIAL_EXPIRED`.
  - Implements `CheckReservationExpirationsAsync` (Job 2) looping through all active tenants and dynamically resolving connection credentials to query each database on the fly.
  - Implements unpaid reservation cancellations (after 15 minutes payment timeout).
  - Implements no-show reservation cancellations (after 30 minutes start time timeout).
  - Implements try-catch wrappers around each tenant connection block to log DB connection exceptions gracefully without interrupting the parent thread.

### Verification
- [x] Verified full C# solution builds with 0 errors and 0 warnings.
- [x] Verified C# test suite runs and passes (14/14 tests passed).

## Yang Belum / Selanjutnya
- [ ] C# FASE 6: CLI Tool implementation (Console administrative commands client).

## Keputusan Arsitektur
1. **Scope Resolution**: Since `BackgroundService` is registered as a Singleton, database contexts are resolved inside an explicit request scope (`IServiceProvider.CreateScope()`) to comply with EF Core DbContext rules.
2. **Graceful Tenant Failovers**: Database reachability checks (`CanConnectAsync`) and connection try-catch blocks prevent server offline states of Tenant A from interrupting background checks on Tenant B.
