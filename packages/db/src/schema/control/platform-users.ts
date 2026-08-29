import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import type { PlatformRole } from '@sibangku/shared';

export const platformUsers = pgTable('platform_users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<PlatformRole>().default('SUPER_ADMIN').notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
