import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { TranslationService } from '../services/translationService';
import { authenticate, requireTenantAccess, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

// Item translations
router.post(
  '/items/:itemId',
  [
    param('itemId').isUUID(),
    body('locale').notEmpty().trim(),
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { locale, title, description } = req.body;
      const translation = await TranslationService.createItemTranslation(
        req.params.itemId,
        req.user!.tenant_id,
        locale,
        title,
        description
      );

      res.status(201).json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/items/:itemId',
  param('itemId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translations = await TranslationService.getItemTranslations(
        req.params.itemId,
        req.user!.tenant_id
      );

      res.json(translations);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/items/:itemId/:locale',
  [
    param('itemId').isUUID(),
    param('locale').notEmpty(),
    body('title').optional().notEmpty().trim(),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translation = await TranslationService.updateItemTranslation(
        req.params.itemId,
        req.params.locale,
        req.user!.tenant_id,
        req.body
      );

      res.json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/items/:itemId/:locale',
  [param('itemId').isUUID(), param('locale').notEmpty()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await TranslationService.deleteItemTranslation(
        req.params.itemId,
        req.params.locale,
        req.user!.tenant_id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Category translations
router.post(
  '/categories/:categoryId',
  [
    param('categoryId').isUUID(),
    body('locale').notEmpty().trim(),
    body('name').notEmpty().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { locale, name } = req.body;
      const translation = await TranslationService.createCategoryTranslation(
        req.params.categoryId,
        req.user!.tenant_id,
        locale,
        name
      );

      res.status(201).json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/categories/:categoryId',
  param('categoryId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translations = await TranslationService.getCategoryTranslations(
        req.params.categoryId,
        req.user!.tenant_id
      );

      res.json(translations);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/categories/:categoryId/:locale',
  [
    param('categoryId').isUUID(),
    param('locale').notEmpty(),
    body('name').optional().notEmpty().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translation = await TranslationService.updateCategoryTranslation(
        req.params.categoryId,
        req.params.locale,
        req.user!.tenant_id,
        req.body
      );

      res.json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/categories/:categoryId/:locale',
  [param('categoryId').isUUID(), param('locale').notEmpty()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await TranslationService.deleteCategoryTranslation(
        req.params.categoryId,
        req.params.locale,
        req.user!.tenant_id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Menu translations
router.post(
  '/menus/:menuId',
  [
    param('menuId').isUUID(),
    body('locale').notEmpty().trim(),
    body('title').notEmpty().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { locale, title } = req.body;
      const translation = await TranslationService.createMenuTranslation(
        req.params.menuId,
        req.user!.tenant_id,
        locale,
        title
      );

      res.status(201).json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/menus/:menuId',
  param('menuId').isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translations = await TranslationService.getMenuTranslations(
        req.params.menuId,
        req.user!.tenant_id
      );

      res.json(translations);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/menus/:menuId/:locale',
  [
    param('menuId').isUUID(),
    param('locale').notEmpty(),
    body('title').optional().notEmpty().trim(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const translation = await TranslationService.updateMenuTranslation(
        req.params.menuId,
        req.params.locale,
        req.user!.tenant_id,
        req.body
      );

      res.json(translation);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/menus/:menuId/:locale',
  [param('menuId').isUUID(), param('locale').notEmpty()],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await TranslationService.deleteMenuTranslation(
        req.params.menuId,
        req.params.locale,
        req.user!.tenant_id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
