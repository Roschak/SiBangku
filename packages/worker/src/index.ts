import { createControlPlaneDb, tenants, auditLogs, subscriptions } from '@sibangku/db';
import { eq, and, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';

console.info('==================================================');
console.info('[Worker] Starting SiBangku Background Worker Node...');
console.info('==================================================');

const connectionString =
  process.env.CONTROL_DATABASE_URL ||
  'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control';

const db = createControlPlaneDb(connectionString);

// Run checkers immediately on startup, then run on intervals
async function checkTrialExpirations() {
  console.info('[Worker] Checking trial expirations...');
  try {
    const now = new Date();
    
    // Find tenants whose status is TRIAL and trialEnd has passed
    const expiredTrials = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.status, 'TRIAL'),
          lt(tenants.trialEnd, now)
        )
      );

    if (expiredTrials.length === 0) {
      console.info('[Worker] No trial expirations found.');
      return;
    }

    for (const tenant of expiredTrials) {
      console.info(`[Worker] Expiring trial for tenant: ${tenant.tenantCode} (${tenant.tenantName})`);
      
      // Update tenant status in transaction
      await db.transaction(async (tx: any) => {
        await tx
          .update(tenants)
          .set({
            status: 'TRIAL_EXPIRED',
            updatedAt: now,
          })
          .where(eq(tenants.tenantId, tenant.tenantId));

        // Insert audit log
        await tx.insert(auditLogs).values({
          id: `audit-${tenant.tenantId}-${Date.now()}`,
          tenantId: tenant.tenantId,
          action: 'trial expired',
          userId: 'system-worker',
          details: {
            expiredAt: now.toISOString(),
            previousStatus: 'TRIAL',
            trialEnd: tenant.trialEnd?.toISOString(),
          },
        });
      });

      // Mock notification trigger (PRD §171 - Whatsapp Notification dispatch)
      console.info(`[Notification Mock] Sent trial expiration alert to tenant: ${tenant.tenantCode}`);
    }
  } catch (err: any) {
    console.error('[Worker] Error checking trial expirations:', err.message);
  }
}

async function checkSubscriptionExpirations() {
  console.info('[Worker] Checking subscription expirations...');
  try {
    const now = new Date();

    // Find tenants whose status is ACTIVE (subscribed)
    const activeTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, 'ACTIVE'));

    for (const tenant of activeTenants) {
      // Find active subscriptions for this tenant
      const activeSubs = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenant.tenantId),
            eq(subscriptions.status, 'ACTIVE')
          )
        );

      // If no active subscriptions, or all active subscriptions have expired (endDate < now)
      const hasValidSub = activeSubs.some((sub: any) => new Date(sub.endDate) > now);

      if (!hasValidSub && activeSubs.length > 0) {
        console.info(`[Worker] Subscription expired for tenant: ${tenant.tenantCode} (${tenant.tenantName})`);

        await db.transaction(async (tx: any) => {
          // Update tenant status
          await tx
            .update(tenants)
            .set({
              status: 'SUBSCRIPTION_EXPIRED',
              updatedAt: now,
            })
            .where(eq(tenants.tenantId, tenant.tenantId));

          // Set subscriptions status to EXPIRED
          await tx
            .update(subscriptions)
            .set({
              status: 'EXPIRED',
              updatedAt: now,
            })
            .where(
              and(
                eq(subscriptions.tenantId, tenant.tenantId),
                eq(subscriptions.status, 'ACTIVE')
              )
            );

          // Insert audit log
          await tx.insert(auditLogs).values({
            id: `audit-sub-exp-${tenant.tenantId}-${Date.now()}`,
            tenantId: tenant.tenantId,
            action: 'subscription expired',
            userId: 'system-worker',
            details: {
              expiredAt: now.toISOString(),
              previousStatus: 'ACTIVE',
            },
          });
        });

        // Mock notification
        console.info(`[Notification Mock] Sent subscription expiration alert to tenant: ${tenant.tenantCode}`);
      }
    }
  } catch (err: any) {
    console.error('[Worker] Error checking subscription expirations:', err.message);
  }
}

// Dispatcher interval configurations (hourly check)
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runWorkerPipeline() {
  await checkTrialExpirations();
  await checkSubscriptionExpirations();
}

// Start immediately
runWorkerPipeline().then(() => {
  console.info('[Worker] Initial check completed. Setup daily interval loop.');
  
  // Set interval loop
  setInterval(() => {
    runWorkerPipeline();
  }, CHECK_INTERVAL_MS);
});
