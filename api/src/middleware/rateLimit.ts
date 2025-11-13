import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.security.rateLimitPerMinute,
  message: { error: 'TooManyRequests', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'TooManyRequests', message: 'Too many authentication attempts' },
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'TooManyRequests', message: 'Too many requests' },
});
