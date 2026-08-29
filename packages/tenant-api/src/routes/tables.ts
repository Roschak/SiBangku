import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { tables } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';
import type { TableShape, TableStatus } from '@sibangku/shared';
import { nanoid } from 'nanoid';

const tableRoutes = new Hono<TenantContext>();

// GET /tables - List all tables (PRD §26, §82)
tableRoutes.get('/tables', async (c) => {
  try {
    const tenantDb = c.get('tenantDb');
    const list = await tenantDb
      .select()
      .from(tables)
      .orderBy(tables.tableNumber);

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Table Routes] List error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve tables',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /tables - Create table (PRD §26, §29)
tableRoutes.post('/tables', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const body = await c.req.json();
    const { tableNumber, tableName, capacity, shape } = body;
    const tenantDb = c.get('tenantDb');

    if (!tableNumber || !tableName || !capacity) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'tableNumber, tableName, and capacity are required fields',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    const tableId = `tbl-${nanoid(8)}`;

    // Check if tableNumber is unique
    const existing = await tenantDb
      .select()
      .from(tables)
      .where(eq(tables.tableNumber, Number(tableNumber)))
      .limit(1);

    if (existing.length > 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_TABLE_NUMBER',
            message: `Table number ${tableNumber} is already in use`,
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    await tenantDb.insert(tables).values({
      id: tableId,
      tableNumber: Number(tableNumber),
      tableName,
      capacity: Number(capacity),
      shape: (shape || 'SQUARE') as TableShape,
      status: 'AVAILABLE',
    });

    return c.json({
      success: true,
      data: {
        id: tableId,
        tableNumber,
        tableName,
        capacity,
        shape,
      },
    });
  } catch (err: any) {
    console.error('[Table Routes] Create error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create table',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// PUT /tables/:id - Update table (position, rotation, name, etc. - PRD §29)
tableRoutes.put('/tables/:id', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const tenantDb = c.get('tenantDb');

    const {
      tableName,
      capacity,
      shape,
      positionX,
      positionY,
      rotation,
      section,
      status,
      minReservationTime,
      maxReservationTime,
    } = body;

    // Check if table exists
    const existing = await tenantDb
      .select()
      .from(tables)
      .where(eq(tables.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Table not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Prepare update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (tableName !== undefined) updateData.tableName = tableName;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (shape !== undefined) updateData.shape = shape as TableShape;
    if (positionX !== undefined) updateData.positionX = Number(positionX);
    if (positionY !== undefined) updateData.positionY = Number(positionY);
    if (rotation !== undefined) updateData.rotation = Number(rotation);
    if (section !== undefined) updateData.section = section;
    if (status !== undefined) updateData.status = status as TableStatus;
    if (minReservationTime !== undefined) updateData.minReservationTime = Number(minReservationTime);
    if (maxReservationTime !== undefined) updateData.maxReservationTime = Number(maxReservationTime);

    await tenantDb.update(tables).set(updateData).where(eq(tables.id, id));

    return c.json({
      success: true,
      message: 'Table updated successfully',
    });
  } catch (err: any) {
    console.error('[Table Routes] Update error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update table details',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /tables/layout - Bulk save positions/layout for Visual Table Builder (PRD §29)
tableRoutes.post('/tables/layout', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const { layout } = await c.req.json(); // expect array of { id, positionX, positionY, rotation, shape }
    const tenantDb = c.get('tenantDb');

    if (!layout || !Array.isArray(layout)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'layout must be a valid array of table position objects',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    console.info(`[Table Routes] Bulk saving table layout positions for ${layout.length} tables`);

    // Run updates sequentially or inside a transaction
    await tenantDb.transaction(async (tx: any) => {
      for (const item of layout) {
        if (!item.id) continue;
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };
        if (item.positionX !== undefined) updateData.positionX = Number(item.positionX);
        if (item.positionY !== undefined) updateData.positionY = Number(item.positionY);
        if (item.rotation !== undefined) updateData.rotation = Number(item.rotation);
        if (item.shape !== undefined) updateData.shape = item.shape as TableShape;

        await tx.update(tables).set(updateData).where(eq(tables.id, item.id));
      }
    });

    return c.json({
      success: true,
      message: 'Floor plan table layout saved successfully',
    });
  } catch (err: any) {
    console.error('[Table Routes] Bulk layout save error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save floor plan layout',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// DELETE /tables/:id - Delete table (PRD §29)
tableRoutes.delete('/tables/:id', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const id = c.req.param('id');
    const tenantDb = c.get('tenantDb');

    const result = await tenantDb
      .delete(tables)
      .where(eq(tables.id, id));

    return c.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (err: any) {
    console.error('[Table Routes] Delete error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete table. Check if there are active reservations pointing to this table.',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { tableRoutes };
