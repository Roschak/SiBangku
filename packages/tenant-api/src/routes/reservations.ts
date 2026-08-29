import { Hono } from 'hono';
import { eq, and, ne, or } from 'drizzle-orm';
import { reservations, tables, orders, orderItems, menuItems, customers } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';
import { nanoid } from 'nanoid';
import { generateReservationNumber } from '@sibangku/shared';
import type { ReservationStatus, OrderStatus } from '@sibangku/shared';

const reservationRoutes = new Hono<TenantContext>();

// GET /reservations - List reservations (PRD §81)
reservationRoutes.get('/reservations', requireTenantUser(['TENANT_ADMIN', 'MANAGER', 'HOST', 'WAITER']), async (c) => {
  try {
    const tenantDb = c.get('tenantDb');
    const dateFilter = c.req.query('date'); // optional filter by YYYY-MM-DD

    let list;
    if (dateFilter) {
      list = await tenantDb
        .select()
        .from(reservations)
        .where(eq(reservations.date, dateFilter))
        .orderBy(reservations.startTime);
    } else {
      list = await tenantDb
        .select()
        .from(reservations)
        .orderBy(reservations.date, reservations.startTime);
    }

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Reservation Routes] List error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reservations',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// GET /reservations/:id - Inspect specific booking (PRD §85)
reservationRoutes.get('/reservations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenantDb = c.get('tenantDb');

    // Retrieve reservation details
    const resResult = await tenantDb
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    const reservation = resResult[0];

    if (!reservation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Retrieve order details if pre-order was enabled
    let preOrderDetails = null;
    if (reservation.preOrderEnabled) {
      const orderResult = await tenantDb
        .select()
        .from(orders)
        .where(eq(orders.reservationId, reservation.id))
        .limit(1);

      const orderRecord = orderResult[0];
      if (orderRecord) {
        const items = await tenantDb
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, orderRecord.id));

        preOrderDetails = {
          ...orderRecord,
          items,
        };
      }
    }

    return c.json({
      success: true,
      data: {
        reservation,
        preOrder: preOrderDetails,
      },
    });

  } catch (err: any) {
    console.error('[Reservation Routes] Inspect error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve reservation details',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /reservations - Create reservation (PRD §31, §34, §204)
// This implements mode 1 & mode 2, dynamic overlapping checks, transactions & locking.
reservationRoutes.post('/reservations', async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerId,
      guestName, // if guest reservation
      guestEmail,
      guestPhone,
      tableId,
      date, // YYYY-MM-DD
      startTime, // HH:MM
      endTime, // HH:MM
      guestCount,
      notes,
      preOrderItems, // array of { menuItemId, quantity, notes } (optional, triggers Mode 2)
    } = body;

    const tenantDb = c.get('tenantDb');

    if (!tableId || !date || !startTime || !endTime || !guestCount) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'tableId, date, startTime, endTime, and guestCount are required fields',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Begin database transaction for conflict prevention (PRD §34, §204)
    const result = await tenantDb.transaction(async (tx: any) => {
      // 1. Lock and check if table exists and is available
      const tableList = await tx
        .select()
        .from(tables)
        .where(eq(tables.id, tableId))
        .limit(1);

      const tableRecord = tableList[0];
      if (!tableRecord || tableRecord.status === 'BLOCKED' || tableRecord.status === 'MAINTENANCE') {
        throw new Error('TABLE_UNAVAILABLE');
      }

      // Check capacity
      if (guestCount > tableRecord.capacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }

      // 2. Query overlapping bookings for same table + same date
      // Overlap formula: (existing.startTime < new.endTime) AND (existing.endTime > new.startTime)
      // We only consider active reservations (not cancelled/expired)
      const activeStatuses: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED', 'COMPLETED'];
      
      const overlaps = await tx
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.tableId, tableId),
            eq(reservations.date, date),
            or(
              eq(reservations.status, 'PENDING'),
              eq(reservations.status, 'CONFIRMED'),
              eq(reservations.status, 'ARRIVED'),
              eq(reservations.status, 'SEATED')
            )
          )
        );

      const hasOverlap = overlaps.some((existing: any) => {
        return existing.startTime < endTime && existing.endTime > startTime;
      });

      if (hasOverlap) {
        throw new Error('TABLE_NO_LONGER_AVAILABLE');
      }

      // 3. Resolve customer or create guest customer record
      let finalCustomerId = customerId;
      if (!finalCustomerId && guestName) {
        const guestId = `cust-${nanoid(8)}`;
        await tx.insert(customers).values({
          id: guestId,
          name: guestName,
          email: guestEmail || null,
          phone: guestPhone || null,
          authMode: 'GUEST',
        });
        finalCustomerId = guestId;
      }

      const reservationId = `rsv-${nanoid(8)}`;
      const reservationNumber = generateReservationNumber();
      const preOrderEnabled = preOrderItems && Array.isArray(preOrderItems) && preOrderItems.length > 0;

      let totalAmount = 0;
      let orderId = null;

      // 4. Handle pre-orders (Mode 2 - PRD §31, §39)
      if (preOrderEnabled) {
        orderId = `ord-${nanoid(8)}`;
        const orderValues: any[] = [];

        for (const item of preOrderItems) {
          const itemRecordResult = await tx
            .select()
            .from(menuItems)
            .where(eq(menuItems.id, item.menuItemId))
            .limit(1);

          const itemRecord = itemRecordResult[0];
          if (!itemRecord || !itemRecord.available) {
            throw new Error(`MENU_ITEM_UNAVAILABLE_${item.menuItemId}`);
          }

          // Check stock
          if (itemRecord.stock !== null && itemRecord.stock < item.quantity) {
            throw new Error(`MENU_ITEM_OUT_OF_STOCK_${itemRecord.name}`);
          }

          const subtotal = itemRecord.price * Number(item.quantity);
          totalAmount += subtotal;

          orderValues.push({
            id: `oi-${nanoid(8)}`,
            orderId,
            menuItemId: item.menuItemId,
            quantity: Number(item.quantity),
            price: itemRecord.price,
            subtotal,
            notes: item.notes || null,
          });

          // Deduct menu item stock if managed
          if (itemRecord.stock !== null) {
            await tx
              .update(menuItems)
              .set({ stock: itemRecord.stock - Number(item.quantity) })
              .where(eq(menuItems.id, item.menuItemId));
          }
        }

        // Insert order record
        await tx.insert(orders).values({
          id: orderId,
          reservationId,
          status: 'PENDING',
          totalAmount,
        });

        // Insert order items
        await tx.insert(orderItems).values(orderValues);
      }

      // 5. Create reservation record
      await tx.insert(reservations).values({
        id: reservationId,
        reservationNumber,
        customerId: finalCustomerId || null,
        tableId,
        date,
        startTime,
        endTime,
        guestCount: Number(guestCount),
        status: 'PENDING',
        paymentStatus: totalAmount > 0 ? 'PENDING' : 'FREE',
        preOrderEnabled,
        totalAmount,
        notes: notes || null,
      });

      return {
        reservationId,
        reservationNumber,
        preOrderEnabled,
        totalAmount,
        orderId,
      };
    });

    return c.json({
      success: true,
      data: result,
    });

  } catch (err: any) {
    console.error('[Reservation Routes] Create booking error:', err.message);

    // Map common error codes
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Failed to create reservation';

    if (err.message === 'TABLE_UNAVAILABLE') {
      status = 400;
      code = 'TABLE_UNAVAILABLE';
      message = 'Meja sedang tidak aktif atau tidak dapat dipesan';
    } else if (err.message === 'CAPACITY_EXCEEDED') {
      status = 400;
      code = 'CAPACITY_EXCEEDED';
      message = 'Jumlah tamu melebihi kapasitas meja';
    } else if (err.message === 'TABLE_NO_LONGER_AVAILABLE') {
      status = 409;
      code = 'TABLE_NO_LONGER_AVAILABLE';
      message = 'Meja telah dipesan di jam tersebut. Silakan pilih meja atau slot waktu lain.';
    } else if (err.message.startsWith('MENU_ITEM_UNAVAILABLE_')) {
      status = 400;
      code = 'MENU_UNAVAILABLE';
      message = 'Salah satu menu pre-order tidak lagi tersedia';
    } else if (err.message.startsWith('MENU_ITEM_OUT_OF_STOCK_')) {
      status = 400;
      code = 'MENU_OUT_OF_STOCK';
      message = `Stok tidak mencukupi untuk menu: ${err.message.replace('MENU_ITEM_OUT_OF_STOCK_', '')}`;
    }

    return c.json(
      {
        success: false,
        error: { code, message, timestamp: new Date().toISOString() },
      },
      status as any
    );
  }
});

// PATCH /reservations/:id/status - Update reservation status (PRD §33)
reservationRoutes.patch('/reservations/:id/status', requireTenantUser(['TENANT_ADMIN', 'MANAGER', 'HOST', 'WAITER']), async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const tenantDb = c.get('tenantDb');

    const allowedStatuses: ReservationStatus[] = [
      'PENDING',
      'CONFIRMED',
      'ARRIVED',
      'SEATED',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
      'EXPIRED',
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
        400
      );
    }

    // Verify reservation exists
    const existingResult = await tenantDb
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    const reservation = existingResult[0];

    if (!reservation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Update reservation status
    await tenantDb
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id));

    // If reservation is CANCELLED, update linked order to CANCELLED as well
    if (status === 'CANCELLED' && reservation.preOrderEnabled) {
      await tenantDb
        .update(orders)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(eq(orders.reservationId, id));
    }

    return c.json({
      success: true,
      message: `Reservation status successfully updated to ${status}`,
    });

  } catch (err: any) {
    console.error('[Reservation Routes] Update status error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update reservation status',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /reservations/:id/cancel - Customer Cancel Policy (PRD §20)
reservationRoutes.post('/reservations/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    const tenantDb = c.get('tenantDb');

    // Retrieve reservation details
    const resResult = await tenantDb
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    const reservation = resResult[0];

    if (!reservation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Prevent cancelling COMPLETED or already CANCELLED bookings
    if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Cannot cancel reservation that is already ${reservation.status}`,
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Cancel reservation
    await tenantDb
      .update(reservations)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(reservations.id, id));

    if (reservation.preOrderEnabled) {
      await tenantDb
        .update(orders)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(eq(orders.reservationId, id));
    }

    return c.json({
      success: true,
      message: 'Reservation successfully cancelled',
    });

  } catch (err: any) {
    console.error('[Reservation Routes] Customer cancel error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel reservation',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { reservationRoutes };
