import { Hono } from 'hono';
import { db } from '../services/db.js';
import { platformUsers } from '@sibangku/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const authRoutes = new Hono();
const jwtSecret = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

authRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

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
        400,
      );
    }

    // Find platform owner user
    const usersList = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, email))
      .limit(1);

    const user = usersList[0];

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        },
        401,
      );
    }

    // Check password
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
        401,
      );
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as any });

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });

  } catch (err: any) {
    console.error('[Auth Route] Login error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during authentication',
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

export { authRoutes };
