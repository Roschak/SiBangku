import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@sibangku/shared';

const jwtSecret = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string';

export const requireSuperAdmin = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication token missing or invalid',
              requestId: c.req.header('x-request-id') || 'unknown',
              timestamp: new Date().toISOString(),
            },
          },
          401,
        );
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      if (decoded.role !== 'SUPER_ADMIN') {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied: SUPER_ADMIN role required',
              requestId: c.req.header('x-request-id') || 'unknown',
              timestamp: new Date().toISOString(),
            },
          },
          403,
        );
      }

      // Add decoded token payload to context variable
      c.set('user', decoded);

      await next();
    } catch (err: any) {
      console.error('[Auth Middleware] Token validation failed:', err.message);
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token is expired or invalid',
            requestId: c.req.header('x-request-id') || 'unknown',
            timestamp: new Date().toISOString(),
          },
        },
        401,
      );
    }
  };
};
