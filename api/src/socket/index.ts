import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export interface SocketData {
  tenantId?: string;
  userId?: string;
  userType?: 'owner' | 'waiter' | 'kitchen' | 'customer';
}

let io: SocketIOServer;

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000', // Dashboard
        'http://localhost:3002', // Public Menu
        'http://localhost:3003', // Kitchen Display
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info('Socket client connected', { socketId: socket.id });

    // Join tenant room
    socket.on('join_tenant', (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
      logger.info('Socket joined tenant room', { socketId: socket.id, tenantId });
    });

    // Join kitchen room
    socket.on('join_kitchen', (tenantId: string) => {
      socket.join(`kitchen:${tenantId}`);
      logger.info('Socket joined kitchen room', { socketId: socket.id, tenantId });
    });

    // Join waiter room
    socket.on('join_waiter', (data: { tenantId: string; waiterId: string }) => {
      socket.join(`waiter:${data.waiterId}`);
      socket.join(`tenant:${data.tenantId}`);
      logger.info('Socket joined waiter room', {
        socketId: socket.id,
        tenantId: data.tenantId,
        waiterId: data.waiterId
      });
    });

    // Join customer session room
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      logger.info('Socket joined session room', { socketId: socket.id, sessionId });
    });

    socket.on('disconnect', () => {
      logger.info('Socket client disconnected', { socketId: socket.id });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Event emitters for various entities
export const socketEvents = {
  // Order events
  orderCreated: (tenantId: string, order: any) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('order:created', order);
    io.to(`kitchen:${tenantId}`).emit('order:created', order);
    logger.info('Emitted order:created event', { tenantId, orderId: order.id });
  },

  orderUpdated: (tenantId: string, order: any) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('order:updated', order);
    io.to(`kitchen:${tenantId}`).emit('order:updated', order);

    // Notify specific waiter if assigned
    if (order.waiter_id) {
      io.to(`waiter:${order.waiter_id}`).emit('order:updated', order);
    }

    // Notify customer session
    if (order.session_id) {
      io.to(`session:${order.session_id}`).emit('order:updated', order);
    }

    logger.info('Emitted order:updated event', { tenantId, orderId: order.id });
  },

  orderClaimed: (tenantId: string, order: any, waiterId: string) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('order:claimed', order);
    io.to(`kitchen:${tenantId}`).emit('order:claimed', order);
    io.to(`waiter:${waiterId}`).emit('order:claimed', order);

    if (order.session_id) {
      io.to(`session:${order.session_id}`).emit('order:claimed', order);
    }

    logger.info('Emitted order:claimed event', { tenantId, orderId: order.id, waiterId });
  },

  itemsDelivered: (tenantId: string, order: any) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('order:items_delivered', order);

    if (order.waiter_id) {
      io.to(`waiter:${order.waiter_id}`).emit('order:items_delivered', order);
    }

    if (order.session_id) {
      io.to(`session:${order.session_id}`).emit('order:items_delivered', order);
    }

    logger.info('Emitted order:items_delivered event', { tenantId, orderId: order.id });
  },

  // Menu events
  menuUpdated: (tenantId: string, menuId: string) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('menu:updated', { menuId });
    logger.info('Emitted menu:updated event', { tenantId, menuId });
  },

  // Table events
  tableStatusChanged: (tenantId: string, table: any) => {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('table:status_changed', table);
    logger.info('Emitted table:status_changed event', { tenantId, tableId: table.id });
  },
};
