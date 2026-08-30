# Docker & Compose Guide

This document describes how the **SiBangku** platform is containerized and orchestrated using Docker and Docker Compose.

## Container Architecture

Each service in the monorepo has its own `Dockerfile` designed to compile TypeScript code and copy only the required packages using multi-stage builds.

We leverage `pnpm deploy` in the builder stage to prune `devDependencies` and isolate the target package along with its workspace dependencies (e.g. `@sibangku/shared` and `@sibangku/db`) into a standalone production directory. This results in minimal production images.

## Dockerfiles List

1.  **Control API**: Located at [packages/control-api/Dockerfile](file:///D:/sertifikat/Apk_SiBangku/packages/control-api/Dockerfile).
    Exposes port `3001` and runs Hono node server from compiled `dist/index.js`.
2.  **Tenant API**: Located at [packages/tenant-api/Dockerfile](file:///D:/sertifikat/Apk_SiBangku/packages/tenant-api/Dockerfile).
    Exposes port `3002` and runs Hono node server from compiled `dist/index.js`.
3.  **Worker**: Located at [packages/worker/Dockerfile](file:///D:/sertifikat/Apk_SiBangku/packages/worker/Dockerfile).
    Runs the infinite background check loop using compiled `dist/index.js` (no ports exposed).
4.  **Web**: Located at [packages/web/Dockerfile](file:///D:/sertifikat/Apk_SiBangku/packages/web/Dockerfile).
    Exposes port `3000` and serves the Next.js portal.

## Orchestration (Docker Compose)

The root [docker-compose.yml](file:///D:/sertifikat/Apk_SiBangku/docker-compose.yml) orchestrates 6 containers:

| Service Name | Image / Build Path | Port (Host:Container) | Description |
| :--- | :--- | :--- | :--- |
| `postgres` | `postgres:16-alpine` | `5432:5432` | Storage for control plane and all dynamic tenant databases. |
| `redis` | `redis:7-alpine` | `6379:6379` | Message and task queues (BullMQ backend support). |
| `control-api` | `./packages/control-api` | `3001:3001` | Control plane REST endpoints, tenant provisioning triggers. |
| `tenant-api` | `./packages/tenant-api` | `3002:3002` | Tenant endpoints, handles table bookings, settings, and billing. |
| `worker` | `./packages/worker` | *None* | Periodically flags expired trials and subscription cycles. |
| `web` | `./packages/web` | `3000:3000` | Unified Next.js frontend portal. |

## Start the Platform

To build and start the entire ecosystem in production/detached mode, run:

```bash
docker compose up --build -d
```

To view logs for all services:

```bash
docker compose logs -f
```

To tear down the containers (preserving postgres data volumes):

```bash
docker compose down
```

## Critical Environment Settings

The following variables in `docker-compose.yml` govern internal networks:

*   **`CONTROL_DATABASE_URL`**: Pointed to `postgresql://sibangku:sibangku_dev@postgres:5432/sibangku_control`. Since the APIs dynamically resolve database connections on the same host, the `postgres` service container name serves as the database host name.
*   **`NEXT_PUBLIC_CONTROL_API_URL`**: Pointed to `http://localhost:3001` (or the server's public IP). This allows the user's browser client to call the Control Plane API.
*   **`NEXT_PUBLIC_TENANT_API_URL`**: Pointed to `http://localhost:3002` (or the server's public IP). This allows the user's browser client to call the Tenant Plane API.
