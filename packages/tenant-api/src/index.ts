import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT_TENANT_API) || 3002;

console.info(`[Tenant API] Starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.info(`[Tenant API] Running at http://localhost:${info.port}`);
});
