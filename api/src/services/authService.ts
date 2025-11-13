import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { AuthResponse, User, Tenant } from '@qrmenu/shared-types';

const SALT_ROUNDS = 10;

export class AuthService {
  static async signup(
    email: string,
    password: string,
    restaurantName: string,
    subdomain: string
  ): Promise<AuthResponse> {
    const client = await query('BEGIN', []);

    try {
      // Check if subdomain is taken
      const subdomainCheck = await query(
        'SELECT id FROM tenants WHERE subdomain = $1',
        [subdomain.toLowerCase()]
      );

      if (subdomainCheck.rows.length > 0) {
        throw new AppError('Subdomain already taken', 400);
      }

      // Check if email is already registered
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (emailCheck.rows.length > 0) {
        throw new AppError('Email already registered', 400);
      }

      // Create tenant
      const tenantResult = await query(
        `INSERT INTO tenants (name, subdomain)
         VALUES ($1, $2)
         RETURNING id`,
        [restaurantName, subdomain.toLowerCase()]
      );

      const tenantId = tenantResult.rows[0].id;

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create owner user
      const userResult = await query(
        `INSERT INTO users (tenant_id, email, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, tenant_id, role, display_name`,
        [tenantId, email.toLowerCase(), passwordHash, 'owner', restaurantName]
      );

      const user = userResult.rows[0];

      // Update tenant with owner reference
      await query(
        'UPDATE tenants SET owner_user_id = $1 WHERE id = $2',
        [user.id, tenantId]
      );

      await query('COMMIT', []);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      logger.info('User signed up', { userId: user.id, tenantId });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      };
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const result = await query(
      `SELECT id, email, password_hash, role, display_name, tenant_id
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    logger.info('User logged in', { userId: user.id });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    const result = await query(
      `SELECT rt.user_id, u.email, u.role, u.display_name, u.tenant_id
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = result.rows[0];

    const accessToken = this.generateAccessToken({
      id: user.user_id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
      tenant_id: user.tenant_id,
    });

    return { access_token: accessToken };
  }

  private static generateAccessToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  private static async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return token;
  }

  static async logout(refreshToken: string): Promise<void> {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
}
