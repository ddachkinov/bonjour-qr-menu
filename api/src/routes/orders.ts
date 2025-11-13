import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { OrderService } from '../services/orderService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';
import type { OrderStatus } from '@qrmenu/shared-types';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const status = req.query.status as OrderStatus | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const orders = await OrderService.listOrders(req.user!.tenant_id, status, limit);

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get('/:orderId', param('orderId').isUUID(), async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await OrderService.getOrder(req.params.orderId, req.user!.tenant_id);

    if (!order) {
      return res.status(404).json({ error: 'NotFound', message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:orderId/status',
  [
    param('orderId').isUUID(),
    body('status').isIn(['new', 'acknowledged', 'in_progress', 'completed', 'cancelled']),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status } = req.body;

      const order = await OrderService.updateOrderStatus(
        req.params.orderId,
        req.user!.tenant_id,
        status,
        req.user!.id
      );

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/stats/summary', async (req: AuthRequest, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const stats = await OrderService.getOrderStats(req.user!.tenant_id, days);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/scan',
  [body('order_token').notEmpty()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { order_token } = req.body;

      const order = await OrderService.getOrderByToken(order_token);

      if (!order) {
        return res.status(404).json({ error: 'NotFound', message: 'Order not found' });
      }

      if (order.tenant_id !== req.user!.tenant_id) {
        return res
          .status(403)
          .json({ error: 'Forbidden', message: 'Access denied' });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
