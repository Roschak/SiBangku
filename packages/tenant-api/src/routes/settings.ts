import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { settings } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';

const settingRoutes = new Hono<TenantContext>();

// GET /settings/:key - Retrieve setting profile (PRD §22, §115)
// Open to public (clients need to fetch branding, timezone, profile)
settingRoutes.get('/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const tenantDb = c.get('tenantDb');

    const result = await tenantDb
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    const settingRecord = result[0];

    if (!settingRecord) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Settings for key "${key}" not found`,
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: settingRecord.value,
    });
  } catch (err: any) {
    console.error('[Setting Routes] Get error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve settings',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /settings/:key - Save/update settings configuration (PRD §21, §22, §25, §35)
settingRoutes.post('/settings/:key', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const key = c.req.param('key');
    const value = await c.req.json();
    const tenantDb = c.get('tenantDb');

    if (!value || typeof value !== 'object') {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Value must be a valid JSON object',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Insert or update on conflict (Drizzle ORM supports upsert but key is primaryKey so standard check & update/insert works)
    const existing = await tenantDb
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await tenantDb
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await tenantDb.insert(settings).values({
        key,
        value,
      });
    }

    return c.json({
      success: true,
      message: `Settings configuration for "${key}" successfully saved`,
      data: value,
    });

  } catch (err: any) {
    console.error('[Setting Routes] Save error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save settings configuration',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { settingRoutes };
