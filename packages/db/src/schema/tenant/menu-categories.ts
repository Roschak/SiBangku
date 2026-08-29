import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const menuCategories = pgTable('menu_categories', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
