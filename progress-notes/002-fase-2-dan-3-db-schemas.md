# FASE 2 & FASE 3: Database Schemas & Migrations

**Status:** ✅ COMPLETED  
**Tanggal Mulai:** 2026-08-29  
**Terakhir Update:** 2026-08-29T17:12:00+07:00

## Yang Sudah Dikerjakan

### Control Plane Database & Schema (FASE 2)
- [x] Schema `tenants.ts` (§11-12)
- [x] Schema `platform-users.ts` (§17)
- [x] Schema `subscriptions.ts` (§46)
- [x] Schema `audit-logs.ts` (§103)
- [x] Generate SQL migration files for control plane (using Drizzle Kit)
- [x] Seeding script (`seed.ts`) to provision the development `admin/admin` account (§4, §113, §185)

### Tenant Database Schema (FASE 3)
- [x] Schema `users.ts` (§18-19)
- [x] Schema `tables.ts` (§26-27)
- [x] Schema `menu-categories.ts` (§37)
- [x] Schema `menu-items.ts` (§38)
- [x] Schema `customers.ts` (§78)
- [x] Schema `reservations.ts` (§32, §34)
- [x] Schema `orders.ts` (§40)
- [x] Schema `order-items.ts` (§39)
- [x] Schema `payments.ts` (§44)
- [x] Schema `settings.ts` (§21-22)
- [x] Generate SQL migration template for tenant plane database

## Yang Belum / Selanjutnya
- [ ] FASE 4: Control Plane API

## Keputusan Arsitektur
1. **Control Plane vs Tenant Plane isolated schemas**: Separation between control plane schema (which dictates tenant state, trials, global billing) and tenant plane schema (managing independent tables, menus, orders, reservations, settings).
2. **Key-Value Jsonb for Tenant Settings**: Tenant settings (like custom branding, primary/secondary colors, logo, favicon, slot duration etc.) are stored in a key-value format utilizing JSONB for maximum flexibility and zero schema migrations overhead.
3. **Database unique constraints**: Placed unique index constraints on `tenant_code` and `table_number` to maintain integrity.

## Catatan
- Seeding default admin user checks `NODE_ENV !== 'production'` to enforce security.
- TypeScript compiler succeeds with zero errors across all database files.
