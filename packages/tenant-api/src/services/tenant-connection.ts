import { createTenantDb, buildTenantConnectionString } from '@sibangku/db';
import type { Tenant } from '@sibangku/shared';

// Cache database pools to avoid leaking connection handles
const tenantDbInstances = new Map<string, any>();

export function getTenantDbConnection(tenant: Tenant) {
  const dbName = tenant.databaseIdentifier;

  if (tenantDbInstances.has(dbName)) {
    return tenantDbInstances.get(dbName);
  }

  // PRD §73: Resolved through control plane configuration credentials
  // For development/local environment, connect to the same PostgreSQL host
  const parsedControlUrl = new URL(
    process.env.CONTROL_DATABASE_URL ||
      'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control'
  );

  const host = parsedControlUrl.hostname;
  const port = Number(parsedControlUrl.port) || 5432;
  const user = parsedControlUrl.username;
  const password = parsedControlUrl.password;

  console.info(`[Tenant DB Cache] Creating connection pool for tenant database: ${dbName}`);
  
  const connectionString = buildTenantConnectionString(host, port, dbName, user, password);
  const tenantDb = createTenantDb(connectionString);

  tenantDbInstances.set(dbName, tenantDb);
  return tenantDb;
}

/**
 * Remove connection pool on tenant destruction
 */
export function removeTenantDbConnection(dbName: string) {
  if (tenantDbInstances.has(dbName)) {
    console.info(`[Tenant DB Cache] Removing connection pool for tenant database: ${dbName}`);
    tenantDbInstances.delete(dbName);
  }
}
