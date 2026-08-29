import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/control/*.ts',
  out: './drizzle/control',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.CONTROL_DATABASE_URL || 'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control',
  },
});
