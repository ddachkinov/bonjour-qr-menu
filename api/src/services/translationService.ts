import pool from '../db';
import type { ItemTranslation, CategoryTranslation, MenuTranslation } from '@qrmenu/shared-types';

export class TranslationService {
  // Item translations
  static async createItemTranslation(
    itemId: string,
    tenantId: string,
    locale: string,
    title: string,
    description?: string
  ): Promise<ItemTranslation> {
    // Verify item belongs to tenant
    const itemCheck = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND tenant_id = $2',
      [itemId, tenantId]
    );

    if (itemCheck.rows.length === 0) {
      throw new Error('Item not found or access denied');
    }

    const result = await pool.query(
      `INSERT INTO item_translations (item_id, locale, title, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_id, locale)
       DO UPDATE SET title = $3, description = $4, updated_at = NOW()
       RETURNING *`,
      [itemId, locale, title, description]
    );

    return result.rows[0];
  }

  static async getItemTranslations(
    itemId: string,
    tenantId: string
  ): Promise<ItemTranslation[]> {
    // Verify item belongs to tenant
    const itemCheck = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND tenant_id = $2',
      [itemId, tenantId]
    );

    if (itemCheck.rows.length === 0) {
      throw new Error('Item not found or access denied');
    }

    const result = await pool.query(
      'SELECT * FROM item_translations WHERE item_id = $1 ORDER BY locale',
      [itemId]
    );

    return result.rows;
  }

  static async updateItemTranslation(
    itemId: string,
    locale: string,
    tenantId: string,
    updates: Partial<{ title: string; description: string }>
  ): Promise<ItemTranslation> {
    // Verify item belongs to tenant
    const itemCheck = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND tenant_id = $2',
      [itemId, tenantId]
    );

    if (itemCheck.rows.length === 0) {
      throw new Error('Item not found or access denied');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    fields.push(`updated_at = NOW()`);
    values.push(itemId, locale);

    const result = await pool.query(
      `UPDATE item_translations
       SET ${fields.join(', ')}
       WHERE item_id = $${paramCount++} AND locale = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Translation not found');
    }

    return result.rows[0];
  }

  static async deleteItemTranslation(
    itemId: string,
    locale: string,
    tenantId: string
  ): Promise<void> {
    // Verify item belongs to tenant
    const itemCheck = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND tenant_id = $2',
      [itemId, tenantId]
    );

    if (itemCheck.rows.length === 0) {
      throw new Error('Item not found or access denied');
    }

    await pool.query(
      'DELETE FROM item_translations WHERE item_id = $1 AND locale = $2',
      [itemId, locale]
    );
  }

  // Category translations
  static async createCategoryTranslation(
    categoryId: string,
    tenantId: string,
    locale: string,
    name: string
  ): Promise<CategoryTranslation> {
    // Verify category belongs to tenant
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (categoryCheck.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    const result = await pool.query(
      `INSERT INTO category_translations (category_id, locale, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_id, locale)
       DO UPDATE SET name = $3, updated_at = NOW()
       RETURNING *`,
      [categoryId, locale, name]
    );

    return result.rows[0];
  }

  static async getCategoryTranslations(
    categoryId: string,
    tenantId: string
  ): Promise<CategoryTranslation[]> {
    // Verify category belongs to tenant
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (categoryCheck.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    const result = await pool.query(
      'SELECT * FROM category_translations WHERE category_id = $1 ORDER BY locale',
      [categoryId]
    );

    return result.rows;
  }

  static async updateCategoryTranslation(
    categoryId: string,
    locale: string,
    tenantId: string,
    updates: Partial<{ name: string }>
  ): Promise<CategoryTranslation> {
    // Verify category belongs to tenant
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (categoryCheck.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    const result = await pool.query(
      `UPDATE category_translations
       SET name = $1, updated_at = NOW()
       WHERE category_id = $2 AND locale = $3
       RETURNING *`,
      [updates.name, categoryId, locale]
    );

    if (result.rows.length === 0) {
      throw new Error('Translation not found');
    }

    return result.rows[0];
  }

  static async deleteCategoryTranslation(
    categoryId: string,
    locale: string,
    tenantId: string
  ): Promise<void> {
    // Verify category belongs to tenant
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
      [categoryId, tenantId]
    );

    if (categoryCheck.rows.length === 0) {
      throw new Error('Category not found or access denied');
    }

    await pool.query(
      'DELETE FROM category_translations WHERE category_id = $1 AND locale = $2',
      [categoryId, locale]
    );
  }

  // Menu translations
  static async createMenuTranslation(
    menuId: string,
    tenantId: string,
    locale: string,
    title: string
  ): Promise<MenuTranslation> {
    // Verify menu belongs to tenant
    const menuCheck = await pool.query(
      'SELECT id FROM menus WHERE id = $1 AND tenant_id = $2',
      [menuId, tenantId]
    );

    if (menuCheck.rows.length === 0) {
      throw new Error('Menu not found or access denied');
    }

    const result = await pool.query(
      `INSERT INTO menu_translations (menu_id, locale, title)
       VALUES ($1, $2, $3)
       ON CONFLICT (menu_id, locale)
       DO UPDATE SET title = $3, updated_at = NOW()
       RETURNING *`,
      [menuId, locale, title]
    );

    return result.rows[0];
  }

  static async getMenuTranslations(
    menuId: string,
    tenantId: string
  ): Promise<MenuTranslation[]> {
    // Verify menu belongs to tenant
    const menuCheck = await pool.query(
      'SELECT id FROM menus WHERE id = $1 AND tenant_id = $2',
      [menuId, tenantId]
    );

    if (menuCheck.rows.length === 0) {
      throw new Error('Menu not found or access denied');
    }

    const result = await pool.query(
      'SELECT * FROM menu_translations WHERE menu_id = $1 ORDER BY locale',
      [menuId]
    );

    return result.rows;
  }

  static async updateMenuTranslation(
    menuId: string,
    locale: string,
    tenantId: string,
    updates: Partial<{ title: string }>
  ): Promise<MenuTranslation> {
    // Verify menu belongs to tenant
    const menuCheck = await pool.query(
      'SELECT id FROM menus WHERE id = $1 AND tenant_id = $2',
      [menuId, tenantId]
    );

    if (menuCheck.rows.length === 0) {
      throw new Error('Menu not found or access denied');
    }

    const result = await pool.query(
      `UPDATE menu_translations
       SET title = $1, updated_at = NOW()
       WHERE menu_id = $2 AND locale = $3
       RETURNING *`,
      [updates.title, menuId, locale]
    );

    if (result.rows.length === 0) {
      throw new Error('Translation not found');
    }

    return result.rows[0];
  }

  static async deleteMenuTranslation(
    menuId: string,
    locale: string,
    tenantId: string
  ): Promise<void> {
    // Verify menu belongs to tenant
    const menuCheck = await pool.query(
      'SELECT id FROM menus WHERE id = $1 AND tenant_id = $2',
      [menuId, tenantId]
    );

    if (menuCheck.rows.length === 0) {
      throw new Error('Menu not found or access denied');
    }

    await pool.query(
      'DELETE FROM menu_translations WHERE menu_id = $1 AND locale = $2',
      [menuId, locale]
    );
  }
}
