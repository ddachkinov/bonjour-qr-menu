import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface Waiter {
  id: string;
  tenant_id: string;
  name: string;
  pin_hash: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaiterAuthResponse {
  waiter: Omit<Waiter, 'pin_hash'>;
  token: string;
}

export class WaiterService {
  private static readonly SALT_ROUNDS = 10;

  static async createWaiter(
    tenantId: string,
    name: string,
    pin: string
  ): Promise<Omit<Waiter, 'pin_hash'>> {
    // Validate PIN (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new AppError('PIN must be exactly 4 digits', 400);
    }

    const pinHash = await bcrypt.hash(pin, this.SALT_ROUNDS);

    const result = await query(
      `INSERT INTO waiters (tenant_id, name, pin_hash, active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, name, active, created_at, updated_at`,
      [tenantId, name, pinHash, true]
    );

    logger.info('Waiter created', { waiterId: result.rows[0].id, name, tenantId });
    return result.rows[0];
  }

  static async authenticate(tenantId: string, name: string, pin: string): Promise<WaiterAuthResponse> {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      throw new AppError('Invalid PIN format', 400);
    }

    const result = await query(
      `SELECT id, tenant_id, name, pin_hash, active, created_at, updated_at
       FROM waiters
       WHERE tenant_id = $1 AND name = $2`,
      [tenantId, name]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const waiter = result.rows[0];

    if (!waiter.active) {
      throw new AppError('Waiter account is inactive', 403);
    }

    const isValidPin = await bcrypt.compare(pin, waiter.pin_hash);

    if (!isValidPin) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        waiterId: waiter.id,
        waiterName: waiter.name,
        tenantId: waiter.tenant_id,
        type: 'waiter',
      },
      config.jwt.secret,
      { expiresIn: config.waiter.tokenExpiry }
    );

    logger.info('Waiter authenticated', { waiterId: waiter.id, name: waiter.name });

    const { pin_hash, ...waiterWithoutPin } = waiter;

    return {
      waiter: waiterWithoutPin,
      token,
    };
  }

  static async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  static async getWaiter(waiterId: string): Promise<Omit<Waiter, 'pin_hash'> | null> {
    const result = await query(
      `SELECT id, tenant_id, name, active, created_at, updated_at
       FROM waiters
       WHERE id = $1`,
      [waiterId]
    );

    return result.rows[0] || null;
  }

  static async listWaiters(tenantId: string, activeOnly: boolean = false): Promise<Omit<Waiter, 'pin_hash'>[]> {
    let queryText = `
      SELECT id, tenant_id, name, active, created_at, updated_at
      FROM waiters
      WHERE tenant_id = $1
    `;

    if (activeOnly) {
      queryText += ' AND active = true';
    }

    queryText += ' ORDER BY name ASC';

    const result = await query(queryText, [tenantId]);
    return result.rows;
  }

  static async updateWaiter(
    waiterId: string,
    tenantId: string,
    updates: { name?: string; pin?: string; active?: boolean }
  ): Promise<Omit<Waiter, 'pin_hash'>> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.pin !== undefined) {
      if (!/^\d{4}$/.test(updates.pin)) {
        throw new AppError('PIN must be exactly 4 digits', 400);
      }
      const pinHash = await bcrypt.hash(updates.pin, this.SALT_ROUNDS);
      fields.push(`pin_hash = $${paramCount}`);
      values.push(pinHash);
      paramCount++;
    }

    if (updates.active !== undefined) {
      fields.push(`active = $${paramCount}`);
      values.push(updates.active);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(waiterId, tenantId);

    const result = await query(
      `UPDATE waiters
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING id, tenant_id, name, active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Waiter not found', 404);
    }

    logger.info('Waiter updated', { waiterId, updates });
    return result.rows[0];
  }

  static async deleteWaiter(waiterId: string, tenantId: string): Promise<void> {
    const result = await query(
      `DELETE FROM waiters WHERE id = $1 AND tenant_id = $2`,
      [waiterId, tenantId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Waiter not found', 404);
    }

    logger.info('Waiter deleted', { waiterId });
  }
}
