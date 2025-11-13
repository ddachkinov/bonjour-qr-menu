import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { OrderService } from '../services/orderService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter, publicLimiter } from '../middleware/rateLimit';
import type { OrderStatus } from '@qrmenu/shared-types';

const router = Router();

// Public endpoints for waiter QR scanning (no auth required)
router.post(
  '/scan',
  publicLimiter,
  [body('order_token').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { order_token } = req.body;
      const order = await OrderService.getOrderByToken(order_token);

      if (!order) {
        return res.status(404).json({ error: 'NotFound', message: 'Order not found or expired' });
      }

      res.json({
        order,
        can_claim: order.status === 'new',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/claim',
  publicLimiter,
  [
    body('order_token').notEmpty(),
    body('waiter_name').notEmpty().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { order_token, waiter_name } = req.body;
      const order = await OrderService.claimOrder(order_token, waiter_name);

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/items/delivered',
  publicLimiter,
  [
    body('order_token').notEmpty(),
    body('item_indices').isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { order_token, item_indices } = req.body;
      const order = await OrderService.markItemsDelivered(order_token, item_indices);

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/waiter/:waiterName',
  publicLimiter,
  async (req, res, next) => {
    try {
      const { waiterName } = req.params;
      const orders = await OrderService.getWaiterOrders(waiterName);

      res.json(orders);
    } catch (error) {
      next(error);
    }
  }
);

// Protected endpoints for authenticated staff
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

export default router;
