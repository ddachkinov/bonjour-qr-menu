import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SessionService } from './sessionService';
import { config } from '../config';
import type { Order, OrderStatus, CartItem } from '@qrmenu/shared-types';
import QRCode from 'qrcode';

export class OrderService {
  static async createOrder(
    sessionId: string,
    notes?: string
  ): Promise<{ order: Order; waiter_qr: string }> {
    // Get session and cart
    const session = await SessionService.getSession(sessionId);

    if (!session) {
      throw new AppError('Session not found or expired', 404);
    }

    const cart = await SessionService.getCart(sessionId);

    if (!cart.items || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Generate order token (HMAC-based)
    const orderToken = this.generateOrderToken();

    // Get currency from first item (assume all items have same currency)
    const currency = 'USD'; // In production, fetch from items table

    // Create order in database
    const result = await query(
      `INSERT INTO orders (
        tenant_id, menu_id, session_id, order_token,
        items, total_amount, currency, status, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, menu_id, session_id, order_token,
                 items, total_amount, currency, status, notes,
                 created_at, updated_at`,
      [
        session.tenant_id,
        session.menu_id,
        sessionId,
        orderToken,
        JSON.stringify(cart.items),
        cart.total,
        currency,
        'new',
        notes || null,
      ]
    );

    const order = result.rows[0];

    // Generate waiter QR code
    const isLocal = config.env === 'development' || config.appBaseDomain.includes('localhost');
    const waiterQrUrl = isLocal
      ? `http://localhost:3002/waiter/order/${orderToken}`
      : `https://${config.appBaseDomain}/waiter/order/${orderToken}`;
    const waiterQr = await QRCode.toDataURL(waiterQrUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    // Clear the cart after successful order
    await SessionService.clearCart(sessionId);

    logger.info('Order created', {
      orderId: order.id,
      tenantId: order.tenant_id,
      sessionId,
    });

    return { order, waiter_qr: waiterQr };
  }

  static async getOrder(orderId: string, tenantId?: string): Promise<Order | null> {
    let queryText = `
      SELECT id, tenant_id, menu_id, session_id, order_token,
             items, total_amount, currency, status, notes,
             waiter_ack_user_id, created_at, updated_at
      FROM orders
      WHERE id = $1
    `;
    const params: any[] = [orderId];

    if (tenantId) {
      queryText += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await query(queryText, params);
    return result.rows[0] || null;
  }

  static async getOrderByToken(orderToken: string): Promise<Order | null> {
    const result = await query(
      `SELECT id, tenant_id, menu_id, session_id, order_token,
              items, total_amount, currency, status, notes,
              waiter_ack_user_id, created_at, updated_at
       FROM orders
       WHERE order_token = $1`,
      [orderToken]
    );

    return result.rows[0] || null;
  }

  static async updateOrderStatus(
    orderId: string,
    tenantId: string,
    status: OrderStatus,
    waiterUserId?: string
  ): Promise<Order> {
    // Validate status transition
    this.validateStatusTransition(status);

    const updateFields = ['status = $1'];
    const params: any[] = [status];
    let paramCount = 2;

    if (waiterUserId && status === 'acknowledged') {
      updateFields.push(`waiter_ack_user_id = $${paramCount}`);
      params.push(waiterUserId);
      paramCount++;
    }

    params.push(orderId, tenantId);

    const result = await query(
      `UPDATE orders
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING id, tenant_id, menu_id, session_id, order_token,
                 items, total_amount, currency, status, notes,
                 waiter_ack_user_id, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    logger.info('Order status updated', { orderId, status, tenantId });
    return result.rows[0];
  }

  static async listOrders(
    tenantId: string,
    status?: OrderStatus,
    limit: number = 50
  ): Promise<Order[]> {
    let queryText = `
      SELECT id, tenant_id, menu_id, session_id, order_token,
             items, total_amount, currency, status, notes,
             waiter_ack_user_id, created_at, updated_at
      FROM orders
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    queryText += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const result = await query(queryText, params);
    return result.rows;
  }

  private static generateOrderToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static validateStatusTransition(status: OrderStatus): void {
    const validStatuses: OrderStatus[] = [
      'new',
      'acknowledged',
      'in_progress',
      'completed',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid order status', 400);
    }
  }

  static async getOrderStats(tenantId: string, days: number = 7): Promise<any> {
    const result = await query(
      `SELECT
         COUNT(*) as total_orders,
         SUM(total_amount) as total_revenue,
         AVG(total_amount) as avg_order_value,
         status,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '${days} days') as recent_orders
       FROM orders
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    return result.rows;
  }

  static async claimOrder(orderToken: string, waiterName: string): Promise<Order> {
    const order = await this.getOrderByToken(orderToken);

    if (!order) {
      throw new AppError('Order not found or expired', 404);
    }

    if (order.status !== 'new') {
      throw new AppError('Order has already been claimed', 400);
    }

    // Parse items and add delivery status
    const items = JSON.parse(order.items as any);
    const itemsWithStatus = items.map((item: any) => ({
      ...item,
      delivered: false,
    }));

    const result = await query(
      `UPDATE orders
       SET status = 'acknowledged',
           items = $1,
           waiter_ack_user_id = $2
       WHERE order_token = $3
       RETURNING id, tenant_id, menu_id, session_id, order_token,
                 items, total_amount, currency, status, notes,
                 waiter_ack_user_id, created_at, updated_at`,
      [JSON.stringify(itemsWithStatus), waiterName, orderToken]
    );

    logger.info('Order claimed by waiter', { orderId: order.id, waiterName });
    return result.rows[0];
  }

  static async markItemsDelivered(
    orderToken: string,
    itemIndices: number[]
  ): Promise<Order> {
    const order = await this.getOrderByToken(orderToken);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const items = JSON.parse(order.items as any);

    // Mark specified items as delivered
    itemIndices.forEach((index) => {
      if (items[index]) {
        items[index].delivered = true;
      }
    });

    // Check if all items are delivered
    const allDelivered = items.every((item: any) => item.delivered);
    const newStatus = allDelivered ? 'completed' : order.status;

    const result = await query(
      `UPDATE orders
       SET items = $1, status = $2
       WHERE order_token = $3
       RETURNING id, tenant_id, menu_id, session_id, order_token,
                 items, total_amount, currency, status, notes,
                 waiter_ack_user_id, created_at, updated_at`,
      [JSON.stringify(items), newStatus, orderToken]
    );

    logger.info('Items marked as delivered', {
      orderId: order.id,
      itemIndices,
      allDelivered,
    });

    return result.rows[0];
  }

  static async getWaiterOrders(waiterName: string): Promise<Order[]> {
    const result = await query(
      `SELECT id, tenant_id, menu_id, session_id, order_token,
              items, total_amount, currency, status, notes,
              waiter_ack_user_id, created_at, updated_at
       FROM orders
       WHERE waiter_ack_user_id = $1
         AND status IN ('acknowledged', 'in_progress')
       ORDER BY created_at DESC`,
      [waiterName]
    );

    return result.rows;
  }

  static async getSessionOrders(sessionId: string): Promise<Order[]> {
    const result = await query(
      `SELECT id, tenant_id, menu_id, session_id, order_token,
              items, total_amount, currency, status, notes,
              waiter_ack_user_id, created_at, updated_at
       FROM orders
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );

    return result.rows;
  }
}
