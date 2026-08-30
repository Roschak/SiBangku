import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { users } from '@sibangku/db';
import { customers } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';
import { nanoid } from 'nanoid';
import type { CustomerAuthMode } from '@sibangku/shared';

const authRoutes = new Hono<TenantContext>();
const jwtSecret = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

// POST /auth/login - Tenant Admin & Staff login (PRD §56)
authRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const tenant = c.get('tenant');
    const tenantDb = c.get('tenantDb');

    if (!email || !password) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Email and password are required',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Query tenant's specific users table
    const result = await tenantDb
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = result[0];

    if (!user || !user.isActive) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.tenantId,
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as any });

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch (err: any) {
    console.error('[Tenant Auth Route] Login error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /auth/change-password - First login password change enforcement (PRD §56, §201)
authRoutes.post('/auth/change-password', requireTenantUser(), async (c) => {
  try {
    const { oldPassword, newPassword } = await c.req.json();
    const userPayload = c.get('user');
    const tenantDb = c.get('tenantDb');

    if (!oldPassword || !newPassword) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Old password and new password are required',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Retrieve user from tenant DB
    const result = await tenantDb
      .select()
      .from(users)
      .where(eq(users.id, userPayload?.sub || ''))
      .limit(1);

    const user = result[0];

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Old password does not match',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Update with new password
    const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await tenantDb
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return c.json({
      success: true,
      message: 'Password successfully changed',
    });
  } catch (err: any) {
    console.error('[Tenant Auth Route] Change password error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to change password',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /auth/customer/register - Customer Optional Auth Mode (PRD §78)
authRoutes.post('/auth/customer/register', async (c) => {
  try {
    const { name, email, phone, password, mode } = await c.req.json();
    const tenant = c.get('tenant');
    const tenantDb = c.get('tenantDb');

    if (!name) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Name is required to register a customer',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    const authMode = (mode || 'GUEST') as CustomerAuthMode;

    let passwordHash: string | null = null;
    if (authMode === 'ACCOUNT' && password) {
      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const customerId = `cust-${nanoid(8)}`;

    await tenantDb.insert(customers).values({
      id: customerId,
      name,
      email: email || null,
      phone: phone || null,
      passwordHash,
      authMode,
    });

    const payload = {
      sub: customerId,
      email: email || '',
      role: 'CUSTOMER',
      tenantId: tenant.tenantId,
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as any });

    return c.json({
      success: true,
      data: {
        token,
        customer: {
          id: customerId,
          name,
          email,
          phone,
          authMode,
        },
      },
    });
  } catch (err: any) {
    console.error('[Tenant Auth Route] Customer register error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register customer',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { authRoutes };
