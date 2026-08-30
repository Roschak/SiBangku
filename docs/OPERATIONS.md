# Operations & Maintenance Guide

This document describes how platform administrators perform common system maintenance task runs, inspect statuses, manage trials, and monitor audit trails.

## 1. Administrative CLI Reference

The platform includes a CLI tool under `packages/cli` to streamline terminal administrative operations.

### Commands List

*   **List Tenants**:
    Prints all registered restaurants, status labels, and trial end timers in a clean table format.
    ```bash
    pnpm --filter @sibangku/cli start tenant list
    ```
*   **Provision a New Tenant**:
    Triggers dynamic database creation, schema migrations, and admin credential seeding.
    ```bash
    pnpm --filter @sibangku/cli start tenant create --name "Resto Bogor" --email "admin@restobogor.com"
    ```
*   **Inspect Tenant Metadata**:
    Prints full JSON details, database identifiers, and billing cycles of a tenant.
    ```bash
    pnpm --filter @sibangku/cli start tenant inspect <tenant_id>
    ```
*   **Suspend a Tenant**:
    Blocks all customer and staff operations. Redirects frontend interfaces to the expired notice screen.
    ```bash
    pnpm --filter @sibangku/cli start tenant suspend <tenant_id>
    ```
*   **Reactivate a Tenant**:
    Restores the tenant's status back to active mode.
    ```bash
    pnpm --filter @sibangku/cli start tenant activate <tenant_id>
    ```
*   **Extend Trial Days**:
    Appends extra days to a tenant's trial duration.
    ```bash
    pnpm --filter @sibangku/cli start tenant extend-trial <tenant_id> --days 30
    ```
*   **Destroy Tenant**:
    Completely deletes database instances, drops connection pools, and purges all metadata. Requires matching tenant code input and typing the confirmation phrase "DESTROY".
    ```bash
    pnpm --filter @sibangku/cli start tenant destroy <tenant_id>
    ```

## 2. Audit Logging

Every critical administrative operation (such as provisioning, suspensions, trial extensions, and destructions) writes audit events to the `audit_logs` table of the control database (PRD §103).

### Audit Payload Structure
An audit record contains:
*   `id`: Unique log identifier.
*   `tenantId`: Target tenant affected by the change.
*   `action`: String identifier (e.g. `suspend tenant`, `extend trial`).
*   `userId`: The platform user who triggered the command.
*   `details`: JSONB object storing relevant state changes (e.g., previous and new end dates).
*   `createdAt`: Timestamp of logging.

Audit logs are viewable via the platform dashboard under `/platform/audit` or via direct database queries.

## 3. Background Job Monitoring

The `@sibangku/worker` package manages expiration checks.
*   **Intervals**: Runs checking loops every hour.
*   **No-Redis Mode**: Connects directly to the PostgreSQL instance using raw pools.
*   **Logs**: Check stdout logs of the worker service to ensure job loops run:
    ```bash
    docker compose logs -f worker
    ```
