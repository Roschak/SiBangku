import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  action: text('action').notNull(),
  userId: text('user_id'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
