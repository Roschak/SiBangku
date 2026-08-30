# C# FASE 2: Database Contexts & Seeder Config

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-30  
**Terakhir Update:** 2026-08-30T17:55:00+07:00

## Yang Sudah Dikerjakan

### NuGet Package Setup
- [x] Added `Microsoft.EntityFrameworkCore` and `Npgsql.EntityFrameworkCore.PostgreSQL` version 9.0.0 to `@sibangku/db` (`SiBangku.Db`).
- [x] Added `Microsoft.EntityFrameworkCore.Design` to startup projects `SiBangku.ControlApi` and `SiBangku.TenantApi` to enable migration commands.
- [x] Added `BCrypt.Net-Next` to `SiBangku.Db` for secure password hashing.

### EF Core DbContexts Implementation
- [x] Created [src/SiBangku.Db/ControlDbContext.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Db/ControlDbContext.cs):
  - Configures platform schemas mapping tables `tenants`, `platform_users`, `subscriptions`, and `audit_logs`.
  - Configures strict constraints (unique keys for `tenant_code` and platform user `email`).
  - Maps `Details` column as PostgreSQL `jsonb` type.
- [x] Created [src/SiBangku.Db/TenantDbContext.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Db/TenantDbContext.cs):
  - Configures dynamic tenant operational tables mapping `users`, `tables`, `menu_categories`, `menu_items`, `customers`, `reservations`, `orders`, `order_items`, `payments`, and `settings`.
  - Enforces field limits, primary keys, and unique indexes on table numbers.

### Platform Initial Seeder
- [x] Created [src/SiBangku.Db/ControlDbSeeder.cs](file:///D:/sertifikat/Apk_SiBangku/src/SiBangku.Db/ControlDbSeeder.cs):
  - Checks if platform admin user `admin` exists.
  - Generates secure BCrypt-hashed password matching default admin password (`admin/admin`) for local developer onboarding (PRD §4, §113, §185).

### Verification
- [x] Verified full C# solution builds with 0 errors and 0 warnings.
- [x] Verified C# test suite runs and passes (7/7 tests passed).

## Yang Belum / Selanjutnya
- [ ] C# FASE 3: Control Plane API Core implementation (JWT auth middleware, dynamic tenant provisioner service).

## Keputusan Arsitektur
1. **EF Core Database Mappings**: Strongly typed database entities keep tables, models, and JSONB payload properties consistent without manual SQL mapping.
2. **System Database Seeding**: Automatic seeding of default credentials in the `ControlDbSeeder` ensures a developer-ready environment immediately upon startup.
