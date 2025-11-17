import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis } from './db/redis';
import { pool } from './db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';

import authRoutes from './routes/auth';
import menuRoutes from './routes/menus';
import orderRoutes from './routes/orders';
import publicRoutes from './routes/public';
import uploadRoutes from './routes/uploads';
import waiterRoutes from './routes/waiters';
import translationRoutes from './routes/translations';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menus', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/waiters', waiterRoutes);
app.use('/api/v1/translations', translationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRedis();
    logger.info('Connected to Redis');

    await pool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL');

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(httpServer);
    logger.info('Socket.io initialized');

    httpServer.listen(config.port, () => {
      logger.info(`API server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`WebSocket server ready`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();
