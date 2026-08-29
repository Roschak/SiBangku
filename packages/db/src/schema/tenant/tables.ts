import { pgTable, text, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core';
import type { TableShape, TableStatus } from '@sibangku/shared';

export const tables = pgTable('tables', {
  id: text('id').primaryKey(),
  tableNumber: integer('table_number').unique().notNull(),
  tableName: text('table_name').notNull(),
  capacity: integer('capacity').notNull(),
  shape: text('shape').$type<TableShape>().default('SQUARE').notNull(),
  positionX: doublePrecision('position_x').default(0).notNull(),
  positionY: doublePrecision('position_y').default(0).notNull(),
  rotation: doublePrecision('rotation').default(0).notNull(),
  section: text('section'),
  status: text('status').$type<TableStatus>().default('AVAILABLE').notNull(),
  minReservationTime: integer('min_reservation_time').default(60).notNull(), // in minutes
  maxReservationTime: integer('max_reservation_time').default(120).notNull(), // in minutes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
