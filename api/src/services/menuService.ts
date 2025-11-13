import { query } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { Menu, Category, Item } from '@qrmenu/shared-types';
import QRCode from 'qrcode';
import { config } from '../config';

export class MenuService {
  static async createMenu(tenantId: string, title: string, slug?: string): Promise<Menu> {
    const menuSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const result = await query(
      `INSERT INTO menus (tenant_id, title, slug, published)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, title, published, slug, public_url, created_at, updated_at`,
      [tenantId, title, menuSlug, false]
    );

    logger.info('Menu created', { menuId: result.rows[0].id, tenantId });
    return result.rows[0];
  }

  static async getMenu(menuId: string, tenantId?: string): Promise<Menu | null> {
    const conditions = ['id = $1'];
    const params: any[] = [menuId];

    if (tenantId) {
      conditions.push('tenant_id = $2');
      params.push(tenantId);
    }

    const result = await query(
      `SELECT id, tenant_id, title, published, slug, public_url, created_at, updated_at
       FROM menus
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    return result.rows[0] || null;
  }

  static async updateMenu(
    menuId: string,
    tenantId: string,
    updates: Partial<Menu>
  ): Promise<Menu> {
    const allowedFields = ['title', 'slug', 'published'];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof Menu] !== undefined) {
        setClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field as keyof Menu]);
        paramCount++;
      }
    }

    if (setClauses.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(menuId, tenantId);

    const result = await query(
      `UPDATE menus
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING id, tenant_id, title, published, slug, public_url, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Menu not found', 404);
    }

    logger.info('Menu updated', { menuId, tenantId });
    return result.rows[0];
  }

  static async publishMenu(menuId: string, tenantId: string): Promise<Menu> {
    // Get tenant subdomain
    const tenantResult = await query(
      'SELECT subdomain FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant not found', 404);
    }

    const subdomain = tenantResult.rows[0].subdomain;
    // For local development, use direct localhost URL. In production, use subdomain routing.
    const isLocal = config.env === 'development' || config.appBaseDomain.includes('localhost');
    const publicUrl = isLocal
      ? `http://localhost:3002/menu/${menuId}`
      : `https://${subdomain}.${config.appBaseDomain}/menu/${menuId}`;

    const result = await query(
      `UPDATE menus
       SET published = true, public_url = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, tenant_id, title, published, slug, public_url, created_at, updated_at`,
      [publicUrl, menuId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Menu not found', 404);
    }

    logger.info('Menu published', { menuId, tenantId, publicUrl });
    return result.rows[0];
  }

  static async generateMenuQR(menuId: string, tenantId: string): Promise<string> {
    const menu = await this.getMenu(menuId, tenantId);

    if (!menu || !menu.published) {
      throw new AppError('Menu not found or not published', 404);
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(menu.public_url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
      });

      return qrDataUrl;
    } catch (error) {
      logger.error('QR generation failed', { error, menuId });
      throw new AppError('Failed to generate QR code', 500);
    }
  }

  static async listMenus(tenantId: string): Promise<Menu[]> {
    const result = await query(
      `SELECT id, tenant_id, title, published, slug, public_url, created_at, updated_at
       FROM menus
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    return result.rows;
  }

  static async deleteMenu(menuId: string, tenantId: string): Promise<void> {
    const result = await query(
      'DELETE FROM menus WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [menuId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Menu not found', 404);
    }

    logger.info('Menu deleted', { menuId, tenantId });
  }

  // Category operations
  static async createCategory(
    menuId: string,
    tenantId: string,
    name: string,
    position?: number
  ): Promise<Category> {
    const result = await query(
      `INSERT INTO categories (menu_id, tenant_id, name, position)
       VALUES ($1, $2, $3, $4)
       RETURNING id, menu_id, tenant_id, name, position, created_at, updated_at`,
      [menuId, tenantId, name, position || 0]
    );

    logger.info('Category created', { categoryId: result.rows[0].id, menuId });
    return result.rows[0];
  }

  static async updateCategory(
    categoryId: string,
    tenantId: string,
    updates: Partial<Category>
  ): Promise<Category> {
    const allowedFields = ['name', 'position'];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof Category] !== undefined) {
        setClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field as keyof Category]);
        paramCount++;
      }
    }

    if (setClauses.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(categoryId, tenantId);

    const result = await query(
      `UPDATE categories
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING id, menu_id, tenant_id, name, position, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }

    return result.rows[0];
  }

  static async deleteCategory(categoryId: string, tenantId: string): Promise<void> {
    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [categoryId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }

    logger.info('Category deleted', { categoryId, tenantId });
  }

  static async listCategories(menuId: string): Promise<Category[]> {
    const result = await query(
      `SELECT id, menu_id, tenant_id, name, position, created_at, updated_at
       FROM categories
       WHERE menu_id = $1
       ORDER BY position, created_at`,
      [menuId]
    );

    return result.rows;
  }

  // Item operations
  static async createItem(
    tenantId: string,
    itemData: {
      menu_id: string;
      category_id: string;
      title: string;
      description: string;
      price: number;
      currency?: string;
      photos?: string[];
      tags?: string[];
      sku?: string;
      dietary_flags?: string[];
    }
  ): Promise<Item> {
    const result = await query(
      `INSERT INTO items (
        menu_id, category_id, tenant_id, title, description,
        price, currency, photos, tags, sku, dietary_flags
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, menu_id, category_id, tenant_id, title, description,
                 price, currency, photos, tags, sku, dietary_flags,
                 created_at, updated_at`,
      [
        itemData.menu_id,
        itemData.category_id,
        tenantId,
        itemData.title,
        itemData.description,
        itemData.price,
        itemData.currency || 'USD',
        itemData.photos || [],
        itemData.tags || [],
        itemData.sku || null,
        itemData.dietary_flags || [],
      ]
    );

    logger.info('Item created', { itemId: result.rows[0].id, tenantId });
    return result.rows[0];
  }

  static async updateItem(
    itemId: string,
    tenantId: string,
    updates: Partial<Item>
  ): Promise<Item> {
    const allowedFields = [
      'title',
      'description',
      'price',
      'currency',
      'photos',
      'tags',
      'sku',
      'dietary_flags',
      'category_id',
    ];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof Item] !== undefined) {
        setClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field as keyof Item]);
        paramCount++;
      }
    }

    if (setClauses.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(itemId, tenantId);

    const result = await query(
      `UPDATE items
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING id, menu_id, category_id, tenant_id, title, description,
                 price, currency, photos, tags, sku, dietary_flags,
                 created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Item not found', 404);
    }

    return result.rows[0];
  }

  static async deleteItem(itemId: string, tenantId: string): Promise<void> {
    const result = await query(
      'DELETE FROM items WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [itemId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Item not found', 404);
    }

    logger.info('Item deleted', { itemId, tenantId });
  }

  static async listItems(menuId: string, categoryId?: string): Promise<Item[]> {
    let queryText = `
      SELECT id, menu_id, category_id, tenant_id, title, description,
             price, currency, photos, tags, sku, dietary_flags,
             created_at, updated_at
      FROM items
      WHERE menu_id = $1
    `;
    const params: any[] = [menuId];

    if (categoryId) {
      queryText += ' AND category_id = $2';
      params.push(categoryId);
    }

    queryText += ' ORDER BY created_at';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getPublicMenu(menuId: string): Promise<{
    menu: Menu;
    categories: Category[];
    items: Item[];
  }> {
    const menuResult = await query(
      `SELECT id, tenant_id, title, published, slug, public_url, created_at, updated_at
       FROM menus
       WHERE id = $1 AND published = true`,
      [menuId]
    );

    if (menuResult.rows.length === 0) {
      throw new AppError('Menu not found or not published', 404);
    }

    const menu = menuResult.rows[0];

    const categories = await this.listCategories(menuId);
    const items = await this.listItems(menuId);

    return { menu, categories, items };
  }
}
