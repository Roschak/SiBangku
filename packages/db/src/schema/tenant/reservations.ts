import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { tables } from './tables';
import type { ReservationStatus } from '@sibangku/shared';

export const reservations = pgTable('reservations', {
  id: text('id').primaryKey(),
  reservationNumber: text('reservation_number').unique().notNull(),
  customerId: text('customer_id')
    .references(() => customers.id, { onDelete: 'set null' }),
  tableId: text('table_id')
    .references(() => tables.id, { onDelete: 'restrict' })
    .notNull(),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  startTime: text('start_time').notNull(), // Format: HH:MM
  endTime: text('end_time').notNull(), // Format: HH:MM
  guestCount: integer('guest_count').notNull(),
  status: text('status').$type<ReservationStatus>().default('PENDING').notNull(),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  preOrderEnabled: boolean('pre_order_enabled').default(false).notNull(),
  totalAmount: integer('total_amount').default(0).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
