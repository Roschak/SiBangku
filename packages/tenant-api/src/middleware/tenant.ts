import type { MiddlewareHandler } from 'hono';
import { controlDb } from '../services/control-db.js';
import { tenants } from '@sibangku/db';
import { eq, or } from 'drizzle-orm';
import { getTenantDbConnection } from '../services/tenant-connection.js';
import type { Tenant, JwtPayload } from '@sibangku/shared';

export interface TenantContext {
  Variables: {
    tenant: Tenant;
    tenantDb: any;
    user?: JwtPayload;
  };
}

export const resolveTenant = (): MiddlewareHandler<TenantContext> => {
  return async (c, next) => {
    try {
      // 1. Resolve tenant identifier
      const tenantIdHeader = c.req.header('x-tenant-id');
      const tenantCodeHeader = c.req.header('x-tenant-code');
      const host = c.req.header('host') || '';

      let tenantRecord: Tenant | undefined;

      // Check headers first (highest priority)
      if (tenantIdHeader) {
        const result = await controlDb
          .select()
          .from(tenants)
          .where(eq(tenants.tenantId, tenantIdHeader))
          .limit(1);
        tenantRecord = result[0];
      } else if (tenantCodeHeader) {
        const result = await controlDb
          .select()
          .from(tenants)
          .where(eq(tenants.tenantCode, tenantCodeHeader.toUpperCase()))
          .limit(1);
        tenantRecord = result[0];
      } else {
        // Resolve from subdomain (e.g. distroavenue.sibangku.example or distroavenue.localhost:3002)
        const parts = host.split('.');
        if (parts.length > 1) {
          const subdomain = parts[0];
          // Skip if subdomain is common hostnames like 'www', 'api', 'control', etc.
          if (!['www', 'api', 'control', 'localhost'].includes(subdomain.toLowerCase())) {
            const result = await controlDb
              .select()
              .from(tenants)
              .where(
                or(
                  eq(tenants.tenantCode, subdomain.toUpperCase()),
                  eq(tenants.webIdentifier, host.split(':')[0]) // Match host without port
                )
              )
              .limit(1);
            tenantRecord = result[0];
          }
        }
      }

      // PRD §71/§72/§106: Tenant context must be resolved and validated server-side.
      if (!tenantRecord) {
        return c.json(
          {
            success: false,
            error: {
              code: 'TENANT_NOT_FOUND',
              message: 'Tenant context could not be resolved',
              requestId: c.req.header('x-request-id') || 'unknown',
              timestamp: new Date().toISOString(),
            },
          },
          404
        );
      }

      // PRD §10, §97, §98, §101: Expiration and suspension enforcement
      const path = c.req.path;
      const isBillingOrAuth =
        path.includes('/auth/') || path.includes('/billing') || path.includes('/settings');
      const isExpiredOrSuspended = [
        'SUSPENDED',
        'TRIAL_EXPIRED',
        'SUBSCRIPTION_EXPIRED',
      ].includes(tenantRecord.status);

      if (isExpiredOrSuspended && !isBillingOrAuth) {
        return c.json(
          {
            success: false,
            error: {
              code: tenantRecord.status,
              message: `Layanan dihentikan sementara: Status restoran ${tenantRecord.status.replace('_', ' ')}. Silakan hubungi pengelola.`,
              requestId: c.req.header('x-request-id') || 'unknown',
              timestamp: new Date().toISOString(),
            },
          },
          403
        );
      }

      // 2. Resolve database connection pool (dynamic Multi-Tenant DB)
      // PRD §13, §73: Dedicated database per tenant resolved through control plane config
      const tenantDb = getTenantDbConnection(tenantRecord);

      // 3. Bind instances to request context
      c.set('tenant', tenantRecord);
      c.set('tenantDb', tenantDb);

      await next();
    } catch (err: any) {
      console.error('[Tenant Resolution Middleware] Error:', err.message);
      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while resolving tenant context',
            requestId: c.req.header('x-request-id') || 'unknown',
            timestamp: new Date().toISOString(),
          },
        },
        500
      );
    }
  };
};
