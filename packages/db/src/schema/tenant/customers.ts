import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { CustomerAuthMode } from '@sibangku/shared';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  authMode: text('auth_mode').$type<CustomerAuthMode>().default('GUEST').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
