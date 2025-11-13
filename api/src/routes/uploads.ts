import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { UploadService } from '../services/uploadService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

router.post(
  '/presign',
  [
    body('filename').notEmpty().trim(),
    body('mime_type').notEmpty(),
    body('intended_use').notEmpty().isIn(['menu-items', 'logos', 'other']),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { filename, mime_type, intended_use } = req.body;

      const result = await UploadService.generatePresignedUpload(
        req.user!.tenant_id,
        filename,
        mime_type,
        intended_use
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
