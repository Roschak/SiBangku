import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { reservations } from './reservations';
import type { OrderStatus } from '@sibangku/shared';

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  reservationId: text('reservation_id')
    .references(() => reservations.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').$type<OrderStatus>().default('PENDING').notNull(),
  totalAmount: integer('total_amount').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
