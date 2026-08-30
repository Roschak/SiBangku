# C# FASE 3: Control Plane API Core & Provisioner

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T18:38:00+07:00

## Yang Sudah Dikerjakan

### NuGet Package Setup
- [x] Added `Microsoft.AspNetCore.Authentication.JwtBearer` to `SiBangku.ControlApi` for JWT token validations.
- [x] Added `Microsoft.AspNetCore.Mvc.Testing` and `Microsoft.EntityFrameworkCore.InMemory` to `SiBangku.Tests` for in-memory integration test assertions.

### Control Plane Service & Program Entry
- [x] Created [src/SiBangku.ControlApi/Services/TenantProvisioner.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.ControlApi/Services/TenantProvisioner.cs):
  - Safely connects to the default system database and creates dynamic databases.
  - Dynamically runs EF schema creations (`EnsureCreatedAsync`) and seeds initial owners and setting parameters.
  - Registers metadata and generates audit logs inside the Control database.
- [x] Created [src/SiBangku.ControlApi/Program.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.ControlApi/Program.cs):
  - Configures JWT Token Validation parameters and role checks.
  - Conditionally swaps EF Core to use `InMemoryDatabase` when test variables are flagged.
  - Exposes health (`/health`, `/liveness`, `/readiness`), security (`/auth/login`), tenant management CRUDs (GET, POST, PATCH, DELETE), manual subscriptions activation, and platform audit logs endpoints.
  - Appended a partial class definition to expose the entry point to integration tests.

### API Integration Tests
- [x] Created [src/SiBangku.Tests/ControlApiIntegrationTests.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Tests/ControlApiIntegrationTests.cs):
  - Boots up the API in memory and runs assertions on all health endpoints.
  - Asserts liveness checks, readiness checker checks, and 404 fallbacks.
- [x] Verified full C# solution builds with 0 errors and 0 warnings.
- [x] Verified C# test suite runs and passes (11/11 tests passed).

## Yang Belum / Selanjutnya
- [ ] C# FASE 4: Tenant Plane API Core implementation (dynamic Db resolution middleware, tenant auth boundaries, table CRUDs).

## Keputusan Arsitektur
1. **Minimal APIs**: Simplifies endpoint declarations and reduces bootstrap overhead compared to heavy MVC controllers.
2. **Conditional DB Context Swapping**: Using a configuration setting (`UseInMemoryDatabase`) allows clean provider swapping without container registration conflicts.
3. **Dynamic DDL Execution**: Leverage ADO.NET Npgsql connection targeting the default `postgres` system catalog for transaction-safe dynamic database creations and terminations.
