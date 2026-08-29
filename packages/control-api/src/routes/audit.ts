import { Hono } from 'hono';
import { db } from '../services/db.js';
import { auditLogs } from '@sibangku/db';
import { eq, desc } from 'drizzle-orm';
import { requireSuperAdmin } from '../middleware/auth.js';
import type { JwtPayload } from '@sibangku/shared';

const auditRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

auditRoutes.use('/audit*', requireSuperAdmin());

// GET /audit - List audit logs (PRD §148)
auditRoutes.get('/audit', async (c) => {
  try {
    const tenantIdFilter = c.req.query('tenantId');

    let query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp));

    if (tenantIdFilter) {
      // In Drizzle, we can refine the selection using where clause
      const filteredList = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantIdFilter))
        .orderBy(desc(auditLogs.timestamp));
        
      return c.json({
        success: true,
        data: filteredList,
      });
    }

    const list = await query;

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Audit Routes] List error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audit logs',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

export { auditRoutes };
