import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { reservations, payments, orderItems, menuItems, tables } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';

const reportRoutes = new Hono<TenantContext>();

reportRoutes.use('/reports*', requireTenantUser(['TENANT_ADMIN', 'MANAGER']));

// GET /reports/analytics - Reservation and operational analytics (PRD §90)
reportRoutes.get('/reports/analytics', async (c) => {
  try {
    const tenantDb = c.get('tenantDb');

    // 1. Calculate Total Reservations by Status
    const statusCounts = await tenantDb
      .select({
        status: reservations.status,
        count: sql<number>`count(${reservations.id})::int`,
      })
      .from(reservations)
      .groupBy(reservations.status);

    // 2. Calculate Total Revenue
    const revenueResult = await tenantDb
      .select({
        total: sql<number>`sum(${payments.amount})::int`,
      })
      .from(payments)
      .where(eq(payments.status, 'PAID'));

    const totalRevenue = revenueResult[0]?.total || 0;

    // 3. Find Popular Menu Items
    const popularMenus = await tenantDb
      .select({
        itemId: menuItems.id,
        itemName: menuItems.name,
        totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
        totalSales: sql<number>`sum(${orderItems.subtotal})::int`,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .groupBy(menuItems.id, menuItems.name)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(5);

    // 4. Calculate Table Utilization (count reservation count per table)
    const tableUtilization = await tenantDb
      .select({
        tableId: tables.id,
        tableName: tables.tableName,
        tableNumber: tables.tableNumber,
        bookingCount: sql<number>`count(${reservations.id})::int`,
      })
      .from(tables)
      .leftJoin(reservations, eq(reservations.tableId, tables.id))
      .groupBy(tables.id, tables.tableName, tables.tableNumber)
      .orderBy(sql`count(${reservations.id}) desc`);

    return c.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          reservationsByStatus: statusCounts,
        },
        popularMenus,
        tableUtilization,
      },
    });

  } catch (err: any) {
    console.error('[Report Routes] Analytics error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate operational reports',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { reportRoutes };
