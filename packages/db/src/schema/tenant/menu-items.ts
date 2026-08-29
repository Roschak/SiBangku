import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { menuCategories } from './menu-categories';

export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  image: text('image'),
  categoryId: text('category_id')
    .references(() => menuCategories.id, { onDelete: 'restrict' })
    .notNull(),
  available: boolean('available').default(true).notNull(),
  stock: integer('stock'), // null represents unlimited stock
  preparationTime: integer('preparation_time'), // in minutes
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
