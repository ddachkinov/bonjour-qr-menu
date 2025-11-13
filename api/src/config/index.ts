import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  appBaseDomain: process.env.APP_BASE_DOMAIN || 'localhost:3000',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/qrmenu_dev',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  session: {
    ttlSeconds: parseInt(process.env.SESSION_TTL_SECONDS || '3600', 10),
  },

  s3: {
    bucket: process.env.S3_BUCKET || 'qrmenu-uploads',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secret: process.env.S3_SECRET || '',
    endpoint: process.env.S3_ENDPOINT,
  },

  cdn: {
    baseUrl: process.env.CDN_BASE_URL || '',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
  },

  queue: {
    url: process.env.QUEUE_URL || 'amqp://localhost:5672',
  },

  security: {
    orderTokenSecret: process.env.ORDER_TOKEN_SECRET || 'order-secret-change-me',
    webhookSecret: process.env.WEBHOOK_SECRET || 'webhook-secret-change-me',
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10),
  },

  stripe: {
    apiKey: process.env.STRIPE_API_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  features: {
    customDomains: process.env.ENABLE_CUSTOM_DOMAINS === 'true',
    webhooks: process.env.ENABLE_WEBHOOKS === 'true',
  },
};

// Validate required configs in production
if (config.env === 'production') {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
    'S3_BUCKET',
    'S3_ACCESS_KEY',
    'S3_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
