import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { reservations } from './reservations';
import type { PaymentProvider, PaymentStatus } from '@sibangku/shared';

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  reservationId: text('reservation_id')
    .references(() => reservations.id, { onDelete: 'cascade' })
    .notNull(),
  provider: text('provider').$type<PaymentProvider>().notNull(),
  providerTransactionId: text('provider_transaction_id'),
  status: text('status').$type<PaymentStatus>().default('PENDING').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').default('IDR').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
