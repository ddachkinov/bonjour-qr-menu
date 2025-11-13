import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { MenuService } from '../services/menuService';
import { SessionService } from '../services/sessionService';
import { OrderService } from '../services/orderService';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(publicLimiter);

router.get('/menus/:menuId', param('menuId').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menuData = await MenuService.getPublicMenu(req.params.menuId);

    res.json(menuData);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/menus/:menuId/session',
  [
    param('menuId').isUUID(),
    body('table_id').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { menuId } = req.params;
      const { table_id } = req.body;

      const menu = await MenuService.getMenu(menuId);

      if (!menu || !menu.published) {
        return res.status(404).json({ error: 'NotFound', message: 'Menu not found' });
      }

      const session = await SessionService.createSession(
        menuId,
        menu.tenant_id,
        table_id
      );

      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/session/:sessionId/cart', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const cart = await SessionService.getCart(sessionId);

    res.json(cart);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/session/:sessionId/cart/items',
  [
    body('item_id').isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('unit_price').isInt({ min: 0 }),
    body('selected_modifiers').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { item_id, quantity, unit_price, selected_modifiers } = req.body;

      const cart = await SessionService.addToCart(sessionId, {
        item_id,
        quantity,
        unit_price,
        selected_modifiers,
        computed_price: unit_price * quantity,
      });

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/session/:sessionId/cart/items/:itemId',
  [
    param('itemId').isUUID(),
    body('quantity').isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId, itemId } = req.params;
      const { quantity } = req.body;

      const cart = await SessionService.updateCartItem(sessionId, itemId, quantity);

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/session/:sessionId/order',
  [body('notes').optional().trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { notes } = req.body;

      const result = await OrderService.createOrder(sessionId, notes);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
