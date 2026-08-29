import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { menuCategories, menuItems } from '@sibangku/db';
import { requireTenantUser } from '../middleware/auth.js';
import type { TenantContext } from '../middleware/tenant.js';
import { nanoid } from 'nanoid';

const menuRoutes = new Hono<TenantContext>();

// ==========================================
// Category Endpoints (PRD §36, §37)
// ==========================================

// GET /categories - List all categories
menuRoutes.get('/categories', async (c) => {
  try {
    const tenantDb = c.get('tenantDb');
    const list = await tenantDb
      .select()
      .from(menuCategories)
      .orderBy(menuCategories.sortOrder);

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Menu Routes] Categories list error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve menu categories',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /categories - Create category
menuRoutes.post('/categories', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const { name, sortOrder } = await c.req.json();
    const tenantDb = c.get('tenantDb');

    if (!name) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Category name is required',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    const categoryId = `cat-${nanoid(8)}`;

    await tenantDb.insert(menuCategories).values({
      id: categoryId,
      name,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      isActive: true,
    });

    return c.json({
      success: true,
      data: { id: categoryId, name, sortOrder },
    });
  } catch (err: any) {
    console.error('[Menu Routes] Create category error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create category',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// DELETE /categories/:id - Delete category
menuRoutes.delete('/categories/:id', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const id = c.req.param('id');
    const tenantDb = c.get('tenantDb');

    await tenantDb.delete(menuCategories).where(eq(menuCategories.id, id));

    return c.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (err: any) {
    console.error('[Menu Routes] Delete category error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete category. Make sure no menu items are pointing to it.',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// ==========================================
// Menu Item Endpoints (PRD §36, §38)
// ==========================================

// GET /menu - List all menu items (PRD §83)
menuRoutes.get('/menu', async (c) => {
  try {
    const categoryId = c.req.query('categoryId');
    const tenantDb = c.get('tenantDb');

    let list;
    if (categoryId) {
      list = await tenantDb
        .select()
        .from(menuItems)
        .where(eq(menuItems.categoryId, categoryId))
        .orderBy(menuItems.sortOrder);
    } else {
      list = await tenantDb
        .select()
        .from(menuItems)
        .orderBy(menuItems.sortOrder);
    }

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('[Menu Routes] Menu list error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve menu items',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// POST /menu - Create menu item
menuRoutes.post('/menu', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      description,
      price,
      categoryId,
      available,
      stock,
      preparationTime,
      sortOrder,
    } = body;
    const tenantDb = c.get('tenantDb');

    if (!name || price === undefined || !categoryId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'name, price, and categoryId are required fields',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    const menuItemId = `item-${nanoid(8)}`;

    await tenantDb.insert(menuItems).values({
      id: menuItemId,
      name,
      description: description || null,
      price: Number(price),
      categoryId,
      available: available !== undefined ? Boolean(available) : true,
      stock: stock !== undefined ? Number(stock) : null,
      preparationTime: preparationTime ? Number(preparationTime) : null,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    });

    return c.json({
      success: true,
      data: {
        id: menuItemId,
        name,
        price,
        categoryId,
      },
    });
  } catch (err: any) {
    console.error('[Menu Routes] Create menu item error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create menu item',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// PUT /menu/:id - Update menu item
menuRoutes.put('/menu/:id', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const tenantDb = c.get('tenantDb');

    const {
      name,
      description,
      price,
      categoryId,
      available,
      stock,
      preparationTime,
      sortOrder,
      image,
    } = body;

    // Verify item exists
    const existing = await tenantDb
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Menu item not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (available !== undefined) updateData.available = Boolean(available);
    if (stock !== undefined) updateData.stock = stock !== null ? Number(stock) : null;
    if (preparationTime !== undefined) updateData.preparationTime = Number(preparationTime);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (image !== undefined) updateData.image = image;

    await tenantDb.update(menuItems).set(updateData).where(eq(menuItems.id, id));

    return c.json({
      success: true,
      message: 'Menu item updated successfully',
    });
  } catch (err: any) {
    console.error('[Menu Routes] Update menu item error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update menu item',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

// DELETE /menu/:id - Delete menu item
menuRoutes.delete('/menu/:id', requireTenantUser(['TENANT_ADMIN', 'MANAGER']), async (c) => {
  try {
    const id = c.req.param('id');
    const tenantDb = c.get('tenantDb');

    await tenantDb.delete(menuItems).where(eq(menuItems.id, id));

    return c.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (err: any) {
    console.error('[Menu Routes] Delete menu item error:', err.message);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete menu item',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export { menuRoutes };
