import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes } from './routes/health.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/api/v1', healthRoutes);

// 404 fallback
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        requestId: c.req.header('x-request-id') || 'unknown',
        timestamp: new Date().toISOString(),
      },
    },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('[Control API] Unhandled error:', err.message);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: c.req.header('x-request-id') || 'unknown',
        timestamp: new Date().toISOString(),
      },
    },
    500,
  );
});

export { app };
