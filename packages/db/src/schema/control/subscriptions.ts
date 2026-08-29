import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import type { SubscriptionStatus, BillingCycle } from '@sibangku/shared';

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.tenantId, { onDelete: 'cascade' })
    .notNull(),
  plan: text('plan').notNull(),
  status: text('status').$type<SubscriptionStatus>().notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  billingCycle: text('billing_cycle').$type<BillingCycle>().notNull(),
  amount: integer('amount').notNull(), // using integer to avoid floating point issues (representing cents or minor units if needed, or flat IDR amount)
  currency: text('currency').notNull(),
  provider: text('provider').notNull(),
  externalSubscriptionId: text('external_subscription_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
