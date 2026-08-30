# C# FASE 4: Tenant Plane API Core & Boundaries

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T18:53:00+07:00

## Yang Sudah Dikerjakan

### NuGet Package Setup
- [x] Added `Microsoft.AspNetCore.Authentication.JwtBearer` to `SiBangku.TenantApi` for user session tokens validation.
- [x] Added `Microsoft.EntityFrameworkCore.InMemory` to `SiBangku.TenantApi` to enable conditional database provider swaps during integration test runs.

### Scoped Tenant Context & Connection Middleware
- [x] Created [src/SiBangku.TenantApi/Services/TenantContext.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.TenantApi/Services/TenantContext.cs) as a scoped state holder for active tenant metadata and database contexts.
- [x] Created [src/SiBangku.TenantApi/Middleware/TenantResolutionMiddleware.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.TenantApi/Middleware/TenantResolutionMiddleware.cs):
  - Resolves tenant identifier using headers (`x-tenant-id`/`x-tenant-code`) or Host subdomain strings.
  - Automatically queries the Control DB context to validate the registration and status of the tenant (active, suspended, expired).
  - Conditionally configures the dynamic tenant database connection to utilize Npgsql or in-memory DB providers based on configuration settings.
  - Automatically ensures tables schemas exist (`EnsureCreatedAsync`) and disposes context pools safely at request teardown.

### Tenant API Implementations & Isolation Guards
- [x] Created [src/SiBangku.TenantApi/Program.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.TenantApi/Program.cs):
  - Registers authentication, authorization, custom middlewares, and CORS policies.
  - Exposes staff authentication (`/auth/login`) generating JWT tokens containing tenant claims.
  - Exposes change password endpoints checking tenant boundaries.
  - Exposes CRUD endpoints for table settings (`/tables` GET, POST, DELETE) with unique checks.
  - Exposes coordinates layout coordinates updates (`PUT /tables/layout`) for visual layout updates.
  - Exposes custom settings and restaurant branding configuration endpoints (`/settings/branding`, `/settings/time_slots`).

### API Integration Tests
- [x] Created [src/SiBangku.Tests/TenantApiIntegrationTests.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Tests/TenantApiIntegrationTests.cs):
  - Boots up `TenantApi` in memory.
  - Seeds mockup tenant registration in the in-memory Control DB.
  - Asserts health check checks and verifies tables CRUD lookups with tenant headers.
- [x] Verified full C# solution builds with 0 errors and 0 warnings.
- [x] Verified C# test suite runs and passes (14/14 tests passed).

## Yang Belum / Selanjutnya
- [ ] C# FASE 5: Background Worker (trial check, reservation expirations check using .NET BackgroundService).

## Keputusan Arsitektur
1. **Dynamic Connection String Swapping**: Resolving host credentials programmatically from the parent string ensures database isolation scales automatically without static pool configurations.
2. **Cross-Tenant Access Verification**: Re-checking that the token's `"TenantId"` claim matches the active request subdomain/header resolves cross-tenant session leaks at the API boundary.
