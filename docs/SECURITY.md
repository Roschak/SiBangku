# Security & Isolation Architecture

This document details the security principles, data isolation techniques, and credential management policies built into **SiBangku**.

## 1. Multi-Tenant Database Isolation

SiBangku implements a strict **Database-per-Tenant** model (PRD §20, §71). 

```text
               +-----------------------+
               | Control Database      |
               | (sibangku_control)    |
               +-----------+-----------+
                           |
            +--------------+--------------+
            |                             |
  +---------v-----------+       +---------v-----------+
  | Tenant A DB         |       | Tenant B DB         |
  | (tenant_resto_a)    |       | (tenant_resto_b)    |
  +---------------------+       +---------------------+
```

*   **No Shared Tables**: All operational tables (reservations, orders, tables, settings, customer database) reside in tenant-specific databases. There are no tenant columns on shared tables.
*   **Dynamic Pools**: The `tenant-api` dynamically resolves connection parameters at runtime. It instantiates a PostgreSQL client pool per active tenant and caches it.
*   **Zero Leakage Cross-Access**: A user authenticated under Tenant A is physically unable to fetch Tenant B's data because their authentication token is validated against Tenant A's database pool, and requests are processed solely within Tenant A's connection instance.

## 2. Authentication Boundaries

The platform uses JSON Web Tokens (JWT) for session authentication. There are two distinct JWT layers:

*   **Super Admin Auth**: Super Admin accounts reside in the `platform_users` table in the Control Plane database. Their tokens carry a `role: 'SUPER_ADMIN'` payload which is verified against `control-api` endpoints using the Super Admin JWT secret.
*   **Tenant Auth**: Tenant Admins and Staff reside in the `users` table of the tenant's individual database. Their tokens carry the matching `tenantId` and `role` (e.g. `TENANT_ADMIN`, `MANAGER`, `WAITER`). The `tenant-api` auth middleware inspects the token payload and validates that:
    1.  The `tenantId` in the JWT matches the tenant currently resolved by host subdomains or headers (PRD §106, §206).
    2.  The token is valid according to the tenant's individual database user record.

## 3. Temporary Password Enforcement

When a new tenant is provisioned (via CLI or Control Plane API), the platform generates a cryptographically secure temporary password (PRD §55, §111).
*   The newly created user is flagged with `mustChangePassword: true` in the database.
*   On login, the `tenant-api` flags this state and redirects the user to the `/admin/change-password` page.
*   The layout checks session cookies/tokens and forbids access to any operational dashboard screens until the password has been successfully updated and the flag has been cleared.

## 4. SQL Injection Prevention

*   **Drizzle ORM**: Active queries leverage parameterized bindings via Drizzle ORM, completely neutralizing standard SQL injections.
*   **Sanitized Schema Creation**: During dynamic provisioning, `CREATE DATABASE` and `DROP DATABASE` command strings must be assembled with raw values because PostgreSQL does not support parameterized query arguments on DDL. To prevent injection:
    *   Tenant names are sanitized into strict alphanumeric lowercase slugs (`a-z0-9`) with a maximum length of 30 characters before database strings are assembled.
    *   Any character outside of the alphanumeric range is discarded during slug generation.
