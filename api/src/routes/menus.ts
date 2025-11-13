import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { MenuService } from '../services/menuService';
import { authenticate, requireTenantAccess, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

router.post(
  '/',
  [
    body('title').notEmpty().trim(),
    body('slug').optional().isSlug(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, slug } = req.body;
      const menu = await MenuService.createMenu(req.user!.tenant_id, title, slug);

      res.status(201).json(menu);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const menus = await MenuService.listMenus(req.user!.tenant_id);
    res.json(menus);
  } catch (error) {
    next(error);
  }
});

router.get('/:menuId', param('menuId').isUUID(), async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menu = await MenuService.getMenu(req.params.menuId, req.user!.tenant_id);

    if (!menu) {
      return res.status(404).json({ error: 'NotFound', message: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:menuId',
  [
    param('menuId').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('slug').optional().isSlug(),
    body('published').optional().isBoolean(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const menu = await MenuService.updateMenu(
        req.params.menuId,
        req.user!.tenant_id,
        req.body
      );

      res.json(menu);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:menuId/publish',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const menu = await MenuService.publishMenu(req.params.menuId, req.user!.tenant_id);

      res.json(menu);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:menuId/qr',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const qrDataUrl = await MenuService.generateMenuQR(
        req.params.menuId,
        req.user!.tenant_id
      );

      res.json({ qr_code: qrDataUrl });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:menuId',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await MenuService.deleteMenu(req.params.menuId, req.user!.tenant_id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:menuId/categories',
  [
    param('menuId').isUUID(),
    body('name').notEmpty().trim(),
    body('position').optional().isInt(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, position } = req.body;
      const category = await MenuService.createCategory(
        req.params.menuId,
        req.user!.tenant_id,
        name,
        position
      );

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:menuId/categories',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categories = await MenuService.listCategories(req.params.menuId);
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:menuId/categories/:categoryId',
  [
    param('menuId').isUUID(),
    param('categoryId').isUUID(),
    body('name').optional().notEmpty().trim(),
    body('position').optional().isInt(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await MenuService.updateCategory(
        req.params.categoryId,
        req.user!.tenant_id,
        req.body
      );

      res.json(category);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:menuId/categories/:categoryId',
  [param('menuId').isUUID(), param('categoryId').isUUID()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await MenuService.deleteCategory(req.params.categoryId, req.user!.tenant_id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:menuId/items',
  [
    param('menuId').isUUID(),
    body('category_id').isUUID(),
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('price').isInt({ min: 0 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('photos').optional().isArray(),
    body('tags').optional().isArray(),
    body('sku').optional().trim(),
    body('dietary_flags').optional().isArray(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const item = await MenuService.createItem(req.user!.tenant_id, {
        menu_id: req.params.menuId,
        ...req.body,
      });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:menuId/items',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const items = await MenuService.listItems(req.params.menuId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:menuId/items/:itemId',
  [param('menuId').isUUID(), param('itemId').isUUID()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const item = await MenuService.updateItem(
        req.params.itemId,
        req.user!.tenant_id,
        req.body
      );

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:menuId/items/:itemId',
  [param('menuId').isUUID(), param('itemId').isUUID()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await MenuService.deleteItem(req.params.itemId, req.user!.tenant_id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
