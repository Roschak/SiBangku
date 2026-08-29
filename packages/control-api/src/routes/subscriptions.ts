import { Hono } from 'hono';
import { db } from '../services/db.js';
import { subscriptions, tenants, auditLogs } from '@sibangku/db';
import { eq, desc } from 'drizzle-orm';
import { requireSuperAdmin } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import type { BillingCycle, SubscriptionStatus, JwtPayload } from '@sibangku/shared';

const subscriptionRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

subscriptionRoutes.use('/subscriptions*', requireSuperAdmin());

// GET /subscriptions - List all subscriptions (PRD §148)
subscriptionRoutes.get('/subscriptions', async (c) => {
  try {
    const list = await db
      .select()
      .from(subscriptions)
      .orderBy(desc(subscriptions.createdAt));

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Subscription Routes] List error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve subscriptions',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

// POST /subscriptions - Activate subscription (PRD §49)
subscriptionRoutes.post('/subscriptions', async (c) => {
  try {
    const body = await c.req.json();
    const {
      tenantId,
      plan,
      billingCycle,
      amount,
      currency,
      provider,
      externalSubscriptionId,
      durationDays = 30, // Default 30 days for monthly cycle
    } = body;

    if (!tenantId || !plan || !billingCycle || !amount || !currency || !provider) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'tenantId, plan, billingCycle, amount, currency, and provider are required fields',
            timestamp: new Date().toISOString(),
          },
        },
        400,
      );
    }

    // Check if tenant exists
    const tenantResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    const tenant = tenantResult[0];

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

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays));

    const subscriptionId = `sub-${nanoid(8)}`;

    // 1. Insert subscription record
    await db.insert(subscriptions).values({
      id: subscriptionId,
      tenantId,
      plan,
      status: 'ACTIVE',
      startDate,
      endDate,
      billingCycle: billingCycle as BillingCycle,
      amount: Number(amount),
      currency,
      provider,
      externalSubscriptionId: externalSubscriptionId || null,
    });

    // 2. Update tenant status to ACTIVE
    await db
      .update(tenants)
      .set({
        status: 'ACTIVE',
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, tenantId));

    const platformUser = c.get('user');

    // 3. Write audit log
    await db.insert(auditLogs).values({
      id: `audit-${tenantId}-sub-active-${Date.now()}`,
      tenantId,
      action: 'subscription activated',
      userId: platformUser.sub,
      details: {
        subscriptionId,
        plan,
        amount,
        endDate,
        billingCycle,
      },
    });

    return c.json({
      success: true,
      data: {
        subscriptionId,
        tenantId,
        plan,
        status: 'ACTIVE',
        startDate,
        endDate,
      },
    });

  } catch (err: any) {
    console.error('[Subscription Routes] Activation error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate subscription',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

export { subscriptionRoutes };
