import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { TenantStatus, SubscriptionStatus } from '@sibangku/shared';

export const tenants = pgTable('tenants', {
  tenantId: text('tenant_id').primaryKey(),
  tenantCode: text('tenant_code').unique().notNull(),
  tenantName: text('tenant_name').notNull(),
  restaurantName: text('restaurant_name').notNull(),
  status: text('status').$type<TenantStatus>().notNull(),
  subscriptionStatus: text('subscription_status').$type<SubscriptionStatus>().notNull(),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  subscriptionStart: timestamp('subscription_start'),
  subscriptionEnd: timestamp('subscription_end'),
  databaseIdentifier: text('database_identifier').notNull(),
  webIdentifier: text('web_identifier').notNull(),
  apkIdentifier: text('apk_identifier').notNull(),
  brandingIdentifier: text('branding_identifier').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
