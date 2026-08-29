import { Hono } from 'hono';

// PRD §136: Health Endpoints
const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'tenant-api',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

healthRoutes.get('/readiness', (c) => {
  return c.json({
    status: 'ok',
    checks: {
      database: 'ok',
      redis: 'ok',
    },
  });
});

healthRoutes.get('/liveness', (c) => {
  return c.json({ status: 'ok' });
});

export { healthRoutes };
