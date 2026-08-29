import { Hono } from 'hono';
import { db } from '../services/db.js';
import { tenants, auditLogs } from '@sibangku/db';
import { eq, desc } from 'drizzle-orm';
import { requireSuperAdmin } from '../middleware/auth.js';
import { provisionTenant } from '../services/tenant-provisioner.js';
import type { TenantStatus, JwtPayload } from '@sibangku/shared';
import pg from 'pg';

const { Client } = pg;
const controlDbUrl =
  process.env.CONTROL_DATABASE_URL ||
  'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control';

const tenantRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

// Apply super admin requirement to all endpoints here
tenantRoutes.use('/tenants*', requireSuperAdmin());

// GET /tenants - List all tenants (PRD §61, §153)
tenantRoutes.get('/tenants', async (c) => {
  try {
    const list = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Tenant Routes] Get list error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tenants list',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// GET /tenants/:id - Inspect specific tenant (PRD §61)
tenantRoutes.get('/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    const tenant = result[0];

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: tenant,
    });
  } catch (err: any) {
    console.error('[Tenant Routes] Inspect error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to inspect tenant',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// POST /tenants - Provision new tenant (PRD §59-60)
tenantRoutes.post('/tenants', async (c) => {
  try {
    const body = await c.req.json();
    const { name, restaurantName, adminEmail, trialDays } = body;

    if (!name || !restaurantName || !adminEmail) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'name, restaurantName, and adminEmail are required fields',
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    const platformUser = c.get('user');

    const result = await provisionTenant({
      tenantName: name,
      restaurantName,
      adminEmail,
      trialDays: trialDays ? Number(trialDays) : undefined,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[Tenant Routes] Provisioning error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'An error occurred during tenant provisioning',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// PATCH /tenants/:id/status - Suspend/Activate/Expire tenant (PRD §61, §97)
tenantRoutes.patch('/tenants/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();

    const allowedStatuses: TenantStatus[] = [
      'ACTIVE',
      'SUSPENDED',
      'TRIAL_EXPIRED',
      'SUBSCRIPTION_EXPIRED',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    const existingResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    const tenant = existingResult[0];

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }

    // Update status in control plane database
    await db
      .update(tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    // Audit action
    let action = 'tenant updated';
    if (status === 'SUSPENDED') action = 'tenant suspended';
    if (status === 'ACTIVE') action = 'tenant activated';
    if (status === 'TRIAL_EXPIRED' || status === 'SUBSCRIPTION_EXPIRED') action = 'trial expired';

    const platformUser = c.get('user');

    await db.insert(auditLogs).values({
      id: `audit-${id}-${status.toLowerCase()}-${Date.now()}`,
      tenantId: id,
      action,
      userId: platformUser.sub,
      details: { previousStatus: tenant.status, newStatus: status },
    });

    return c.json({
      success: true,
      message: `Tenant status successfully updated to ${status}`,
    });
  } catch (err: any) {
    console.error('[Tenant Routes] Update status error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tenant status',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// PATCH /tenants/:id/extend-trial - Extend trial (PRD §50, §61)
tenantRoutes.patch('/tenants/:id/extend-trial', async (c) => {
  try {
    const id = c.req.param('id');
    const { days } = await c.req.json();

    if (!days || isNaN(Number(days)) || Number(days) <= 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'days must be a valid positive number',
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    const existingResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    const tenant = existingResult[0];

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }

    const currentTrialEnd = tenant.trialEnd ? new Date(tenant.trialEnd) : new Date();
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + Number(days));

    // Update trial end date
    await db
      .update(tenants)
      .set({
        trialEnd: newTrialEnd,
        status: 'TRIAL', // Restore back to trial status if it was expired
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const platformUser = c.get('user');

    // Audit log
    await db.insert(auditLogs).values({
      id: `audit-${id}-trial-extended-${Date.now()}`,
      tenantId: id,
      action: 'trial extended',
      userId: platformUser.sub,
      details: {
        previousTrialEnd: tenant.trialEnd,
        newTrialEnd,
        extendedDaysCount: Number(days),
      },
    });

    return c.json({
      success: true,
      message: `Tenant trial extended successfully by ${days} days`,
      data: {
        trialEnd: newTrialEnd,
      },
    });
  } catch (err: any) {
    console.error('[Tenant Routes] Extend trial error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to extend tenant trial period',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// DELETE /tenants/:id - Destroy tenant (PRD §61, §96)
tenantRoutes.delete('/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { confirmationPhrase, code } = await c.req.json();

    const existingResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    const tenant = existingResult[0];

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
            timestamp: new Date().toISOString(),
          },
        },
        404,
      );
    }

    // Verification
    if (code !== tenant.tenantCode || confirmationPhrase !== 'DESTROY') {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Destruction validation failed. Code must match tenant code, and confirmation phrase must be "DESTROY"',
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    console.info(`[Tenant Routes] Deleting database ${tenant.databaseIdentifier} for tenant ${id}`);

    // Clean physical database
    const parsedUrl = new URL(controlDbUrl);
    const systemDbUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/postgres`;
    const pgClient = new Client({ connectionString: systemDbUrl });
    await pgClient.connect();

    try {
      // Disconnect active database pools before drop database
      await pgClient.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid();
      `, [tenant.databaseIdentifier]);

      await pgClient.query(`DROP DATABASE IF EXISTS ${tenant.databaseIdentifier}`);
    } finally {
      await pgClient.end();
    }

    const platformUser = c.get('user');

    // Remove from control plane DB
    await db.delete(tenants).where(eq(tenants.tenantId, id));

    // Audit log
    await db.insert(auditLogs).values({
      id: `audit-${id}-destroyed-${Date.now()}`,
      tenantId: id,
      action: 'tenant deleted',
      userId: platformUser.sub,
      details: { tenantCode: tenant.tenantCode, tenantName: tenant.tenantName },
    });

    return c.json({
      success: true,
      message: 'Tenant successfully destroyed and database deleted',
    });

  } catch (err: any) {
    console.error('[Tenant Routes] Destroy error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to destroy tenant',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

export { tenantRoutes };
