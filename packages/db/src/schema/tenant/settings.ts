import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
  key: text('key').primaryKey(), // e.g., 'branding', 'time_slots', 'restaurant_profile', 'payment_settings'
  value: jsonb('value').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
