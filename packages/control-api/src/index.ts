import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT_CONTROL_API) || 3001;

console.info(`[Control API] Starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.info(`[Control API] Running at http://localhost:${info.port}`);
});
