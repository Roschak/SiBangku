import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

/**
 * Create a database connection pool for the control plane.
 */
export function createControlPlaneDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool);
}

/**
 * Create a database connection pool for a specific tenant.
 * PRD §13-14: Each tenant has a dedicated database.
 */
export function createTenantDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool);
}

/**
 * Build tenant database connection string.
 * PRD §73: Resolved through trusted control plane configuration.
 */
export function buildTenantConnectionString(
  host: string,
  port: number,
  database: string,
  user: string,
  password: string,
): string {
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
