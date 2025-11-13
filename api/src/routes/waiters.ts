import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { WaiterService } from '../services/waiterService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { publicLimiter, apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Public waiter authentication endpoints (no auth required)
router.post(
  '/login',
  publicLimiter,
  [
    body('tenant_id').isUUID(),
    body('name').notEmpty().trim(),
    body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tenant_id, name, pin } = req.body;
      const result = await WaiterService.authenticate(tenant_id, name, pin);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/verify',
  publicLimiter,
  [body('token').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token } = req.body;
      const decoded = await WaiterService.verifyToken(token);

      res.json({ valid: true, waiter: decoded });
    } catch (error) {
      next(error);
    }
  }
);

// Protected endpoints for restaurant owners/managers
router.use(authenticate);
router.use(apiLimiter);

router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, pin } = req.body;
      const waiter = await WaiterService.createWaiter(req.user!.tenant_id, name, pin);

      res.status(201).json(waiter);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const waiters = await WaiterService.listWaiters(req.user!.tenant_id, activeOnly);

    res.json(waiters);
  } catch (error) {
    next(error);
  }
});

router.get('/:waiterId', param('waiterId').isUUID(), async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const waiter = await WaiterService.getWaiter(req.params.waiterId);

    if (!waiter) {
      return res.status(404).json({ error: 'NotFound', message: 'Waiter not found' });
    }

    // Verify waiter belongs to this tenant
    if (waiter.tenant_id !== req.user!.tenant_id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    }

    res.json(waiter);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:waiterId',
  [
    param('waiterId').isUUID(),
    body('name').optional().trim(),
    body('pin').optional().matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
    body('active').optional().isBoolean(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, pin, active } = req.body;
      const waiter = await WaiterService.updateWaiter(
        req.params.waiterId,
        req.user!.tenant_id,
        { name, pin, active }
      );

      res.json(waiter);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:waiterId', param('waiterId').isUUID(), async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await WaiterService.deleteWaiter(req.params.waiterId, req.user!.tenant_id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
