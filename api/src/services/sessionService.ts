import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../db/redis';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { CartItem, Cart } from '@qrmenu/shared-types';

const SESSION_PREFIX = 'session:';
const CART_PREFIX = 'cart:';

export class SessionService {
  static async createSession(
    menuId: string,
    tenantId: string,
    tableId?: string
  ): Promise<{ session_id: string; expires_at: Date }> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + config.session.ttlSeconds * 1000);

    const sessionData = {
      session_id: sessionId,
      menu_id: menuId,
      tenant_id: tenantId,
      table_id: tableId || null,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await redisClient.setEx(
      `${SESSION_PREFIX}${sessionId}`,
      config.session.ttlSeconds,
      JSON.stringify(sessionData)
    );

    logger.info('Session created', { sessionId, menuId, tableId });
    return { session_id: sessionId, expires_at: expiresAt };
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const data = await redisClient.get(`${SESSION_PREFIX}${sessionId}`);

    if (!data) {
      return null;
    }

    const session = JSON.parse(data);

    // Update last activity
    await this.touchSession(sessionId);

    return session;
  }

  static async touchSession(sessionId: string): Promise<void> {
    const data = await redisClient.get(`${SESSION_PREFIX}${sessionId}`);

    if (data) {
      const session = JSON.parse(data);
      session.last_activity = new Date().toISOString();

      await redisClient.setEx(
        `${SESSION_PREFIX}${sessionId}`,
        config.session.ttlSeconds,
        JSON.stringify(session)
      );
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await redisClient.del(`${SESSION_PREFIX}${sessionId}`);
    await redisClient.del(`${CART_PREFIX}${sessionId}`);
    logger.info('Session deleted', { sessionId });
  }

  static async addToCart(
    sessionId: string,
    item: CartItem
  ): Promise<Cart> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new AppError('Session not found or expired', 404);
    }

    const cartData = await redisClient.get(`${CART_PREFIX}${sessionId}`);
    let cart: Cart = cartData
      ? JSON.parse(cartData)
      : { session_id: sessionId, items: [], total: 0 };

    // Find existing item or add new
    const existingIndex = cart.items.findIndex(
      (i) => i.item_id === item.item_id
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += item.quantity;
      cart.items[existingIndex].computed_price =
        cart.items[existingIndex].unit_price * cart.items[existingIndex].quantity;
    } else {
      item.computed_price = item.unit_price * item.quantity;
      cart.items.push(item);
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, i) => sum + i.computed_price, 0);

    await redisClient.setEx(
      `${CART_PREFIX}${sessionId}`,
      config.session.ttlSeconds,
      JSON.stringify(cart)
    );

    logger.debug('Item added to cart', { sessionId, itemId: item.item_id });
    return cart;
  }

  static async updateCartItem(
    sessionId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new AppError('Session not found or expired', 404);
    }

    const cartData = await redisClient.get(`${CART_PREFIX}${sessionId}`);

    if (!cartData) {
      throw new AppError('Cart not found', 404);
    }

    const cart: Cart = JSON.parse(cartData);

    const itemIndex = cart.items.findIndex((i) => i.item_id === itemId);

    if (itemIndex < 0) {
      throw new AppError('Item not in cart', 404);
    }

    if (quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].computed_price =
        cart.items[itemIndex].unit_price * quantity;
    }

    // Recalculate total
    cart.total = cart.items.reduce((sum, i) => sum + i.computed_price, 0);

    await redisClient.setEx(
      `${CART_PREFIX}${sessionId}`,
      config.session.ttlSeconds,
      JSON.stringify(cart)
    );

    logger.debug('Cart item updated', { sessionId, itemId, quantity });
    return cart;
  }

  static async getCart(sessionId: string): Promise<Cart> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new AppError('Session not found or expired', 404);
    }

    const cartData = await redisClient.get(`${CART_PREFIX}${sessionId}`);

    if (!cartData) {
      return { session_id: sessionId, items: [], total: 0 };
    }

    return JSON.parse(cartData);
  }

  static async clearCart(sessionId: string): Promise<void> {
    await redisClient.del(`${CART_PREFIX}${sessionId}`);
    logger.debug('Cart cleared', { sessionId });
  }
}
