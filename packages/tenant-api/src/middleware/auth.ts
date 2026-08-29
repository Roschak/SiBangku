import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import type { JwtPayload, TenantRole } from '@sibangku/shared';
import type { TenantContext } from './tenant.js';

const jwtSecret = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string';

export const requireTenantUser = (allowedRoles?: TenantRole[]): MiddlewareHandler<TenantContext> => {
  return async (c, next) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication token is missing',
              timestamp: new Date().toISOString(),
            },
          },
          401
        );
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      const tenant = c.get('tenant');

      // PRD §106/§107/§206: Tenant Security Boundary
      // Validate that the user belongs to the current resolved tenant!
      // This prevents cross-tenant token leaks or token hijacking.
      if (decoded.role !== 'SUPER_ADMIN' && decoded.tenantId !== tenant.tenantId) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied: You do not belong to this tenant space',
              timestamp: new Date().toISOString(),
            },
          },
          403
        );
      }

      // Check role permissions if specified
      if (allowedRoles && allowedRoles.length > 0) {
        const hasRole = allowedRoles.includes(decoded.role as TenantRole) || decoded.role === 'SUPER_ADMIN';
        if (!hasRole) {
          return c.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Access denied: Insufficient role permissions',
                timestamp: new Date().toISOString(),
              },
            },
            403
          );
        }
      }

      // Store user payload on context
      c.set('user', decoded);

      await next();
    } catch (err: any) {
      console.error('[Tenant Auth Middleware] Authentication failed:', err.message);
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token is expired or invalid',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }
  };
};
