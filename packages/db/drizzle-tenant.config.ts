import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/tenant/*.ts',
  out: './drizzle/tenant',
  dialect: 'postgresql',
  // No active DB connection url is needed to generate migrations,
  // but drizzle-kit requires a dummy value or env for structure
  dbCredentials: {
    url: process.env.CONTROL_DATABASE_URL || 'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_tenant_dummy',
  },
});
