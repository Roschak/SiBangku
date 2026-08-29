import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { menuItems } from './menu-items';

export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  menuItemId: text('menu_item_id')
    .references(() => menuItems.id, { onDelete: 'restrict' })
    .notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  subtotal: integer('subtotal').notNull(),
  notes: text('notes'),
});
