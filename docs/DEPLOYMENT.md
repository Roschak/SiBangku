# Provisioning & Deployment Guide

This document outlines how new tenant database structures, trial boundaries, and active subscription updates are provisioned and maintained.

## 1. Dynamic Tenant Provisioning Workflow

When a restaurant registers, the control plane triggers the `Tenant Provisioner` to create a dedicated operational database on demand (PRD §53, §77):

```text
Platform Owner       Control API         Tenant Provisioner     Postgres Server
      |                   |                     |                      |
      |-- POST /tenants ->|                     |                      |
      |                   |-- provisionTenant ->|                      |
      |                   |                     |-- CREATE DATABASE -->|
      |                   |                     |-- Run Migrations --->|
      |                   |                     |-- Seed Admin User -->|
      |                   |<-- Return Success --|                      |
      |<-- Return Info ---|                     |                      |
```

1.  **Identifier Generation**:
    *   `tenantId`: Unique string formatted as `TEN-YYYY-XXXXXX`.
    *   `tenantSlug`: Sanitized lowercase alphanumeric code representing the restaurant name.
    *   `databaseIdentifier`: Formatted as `tenant_<tenantSlug>`.
    *   `temporaryPassword`: Secure random credentials.
2.  **Physical DB Creation**: Connects to the postgres system database and runs `CREATE DATABASE <db_name>` using an injection-safe client connection.
3.  **Dynamic Migration Execution**: Programmatically imports `@sibangku/db` and runs Drizzle migrations targeting the newly created database to deploy the schema.
4.  **Data Seeding**: Inserts default administrative accounts, initial branding profiles, and timezone parameters into the new database.

## 2. Trial & Subscription Lifecycle

Tenant statuses are governed by server-side dates (PRD §5, §89):

```text
               +-----------------------+
               |      PROVISIONED      |
               +-----------+-----------+
                           |
                           v
               +-----------------------+
               |         TRIAL         |
               +-----+-----------+-----+
                     |           |
      (Trial Expired)|           | (Subscription Purchased)
                     v           v
        +---------------+     +--------+
        | TRIAL_EXPIRED |     | ACTIVE |
        +---------------+     +---+----+
                                  |
               (Subscription End) |
                                  v
                    +----------------------+
                    | SUBSCRIPTION_EXPIRED |
                    +----------------------+
```

*   **Trial Expiry**: Checked periodically by the background worker. If the current server time exceeds the registered `trialEnd` date, status is updated to `TRIAL_EXPIRED`.
*   **Block Restrictions**: When status changes to `TRIAL_EXPIRED` or `SUSPENDED`, requests to `tenant-api` middleware are blocked. Visitors are redirected to a dedicated `/expired` page containing platform contact links (PRD §101).
*   **Subscription Upgrades**: Handled via `POST /api/v1/subscriptions`. This updates the tenant's record to `ACTIVE` and pushes the `subscriptionEnd` boundary date.
