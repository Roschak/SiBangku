import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes } from './routes/health.js';
import { resolveTenant, type TenantContext } from './middleware/tenant.js';
import { authRoutes } from './routes/auth.js';
import { tableRoutes } from './routes/tables.js';
import { menuRoutes } from './routes/menu.js';
import { reservationRoutes } from './routes/reservations.js';
import { settingRoutes } from './routes/settings.js';
import { paymentRoutes } from './routes/payments.js';
import { reportRoutes } from './routes/reports.js';

const app = new Hono<TenantContext>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
// 1. Health routes do not require tenant resolution
app.route('/api/v1', healthRoutes);

// 2. Resolve tenant for all operational API routes
app.use('/api/v1/*', resolveTenant());

// 3. Register operational tenant routes
app.route('/api/v1', authRoutes);
app.route('/api/v1', tableRoutes);
app.route('/api/v1', menuRoutes);
app.route('/api/v1', reservationRoutes);
app.route('/api/v1', settingRoutes);
app.route('/api/v1', paymentRoutes);
app.route('/api/v1', reportRoutes);

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
  console.error('[Tenant API] Unhandled error:', err.message);
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
