# Code Structure Guide

This document outlines the directory structure and packages of the **SiBangku** monorepo.

## Monorepo Layout

The project is structured as a `pnpm` monorepo workspace to manage shared packages, API servers, background processors, and web applications efficiently.

```text
D:\sertifikat\Apk_SiBangku\
├── docker-compose.yml           # Complete system orchestration compose config
├── package.json                 # Monorepo root package definitions
├── pnpm-workspace.yaml          # PNPM workspaces configuration
├── tsconfig.base.json           # Common typescript configurations
├── docs/                        # Technical system documentation
│   ├── CODE_STRUCTURE.md
│   ├── DOCKER.md
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── RESERVATION.md
│   ├── TABLE_LAYOUT.md
│   ├── PAYMENT.md
│   ├── MENU.md
│   ├── APK_BUILD.md
│   ├── WEB_BUILD.md
│   ├── DEPLOYMENT.md
│   └── OPERATIONS.md
├── progress-notes/              # Phase-by-phase development logs
└── packages/                    # Workspace packages
    ├── shared/                  # Common TypeScript types, constants, and utilities
    ├── db/                      # Drizzle ORM schemas, migrations, and connections
    ├── control-api/             # Hono API Server managing the Control Plane
    ├── tenant-api/              # Hono API Server managing the Tenant operational plane
    ├── worker/                  # Background worker loop checking trial/subscriptions
    ├── cli/                     # CLI administrative tool for platform management
    └── web/                     # Unified Next.js 15 app for Admin, Platform, and Customer
```

## Package Descriptions

### 1. `@sibangku/shared` (packages/shared)
Contains shared code used by both the backend API nodes, CLI, and frontend apps.
*   **Types**: Defines TypeScript declarations for reservations, menus, auth payloads, tenants, payments, and API formats.
*   **Constants**: Houses trial durations, categories, validation rules, and default styles.
*   **Utils**: Contains generator utilities (`generateTenantId`, `generateTemporaryPassword`, `generateTenantSlug`, etc.).

### 2. `@sibangku/db` (packages/db)
Houses schema files, migrations, connection pools, and database seeds.
*   **Control Plane Database Schema**: Manages `tenants`, `platform-users`, `subscriptions`, and `audit-logs`.
*   **Tenant Database Schema**: Manages tenant-isolated tables like `users`, `tables`, `menu-items`, `menu-categories`, `customers`, `reservations`, `orders`, `order-items`, `payments`, and `settings`.
*   **Drizzle Configurations**: Distinct configuration files for control database generation and tenant migration templates.

### 3. `@sibangku/control-api` (packages/control-api)
The API service exposing endpoints to manage the control plane.
*   Authenticates Super Admins via JWT.
*   Implements the `Tenant Provisioner` which programmatically creates physical PostgreSQL databases, runs migrations, and seeds tenant data on the fly.
*   Manages trial extensions, suspensions, and tenant database purging.

### 4. `@sibangku/tenant-api` (packages/tenant-api)
The API service serving operational requests for each restaurant.
*   Uses a dynamic middleware that maps incoming host subdomains or headers to cached PostgreSQL connection pools.
*   Handles reservation bookings, menu edits, visual table coordinates, and payment webhooks.
*   Enforces strict tenant isolation checking user tokens against request boundaries.

### 5. `@sibangku/worker` (packages/worker)
A stateless Node.js background process.
*   Runs periodically using internal timers.
*   Pulls active trial and subscription records.
*   Transitions expired trial records to `TRIAL_EXPIRED` and expired subscription records to `SUBSCRIPTION_EXPIRED`, outputting audit trails and logging mock notifications.

### 6. `@sibangku/cli` (packages/cli)
An administrative CLI tool based on `Commander.js`.
*   Allows platform administrators to manage the control plane via terminal commands.
*   Features trial extension, suspension, tenant creation, and full database destruction (with safety prompt confirmations).

### 7. `@sibangku/web` (packages/web)
A unified React portal using Next.js 15.
*   **`/platform/*`**: Super Admin dashboard to manage billing, tenants, and system-wide audits.
*   **`/admin/*`**: Restaurant dashboard where tenant admins build layouts, manage reservations, change theme colors, and view analytics.
*   **`/*`**: Customer-facing portal where guests browse menus, select time slots, choose tables on a visual floor plan canvas, pre-order meals, and pay.
