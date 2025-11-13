import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { authLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post(
  '/signup',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('restaurant_name').notEmpty().trim(),
    body('subdomain').notEmpty().isSlug().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, restaurant_name, subdomain } = req.body;

      const result = await AuthService.signup(
        email,
        password,
        restaurant_name,
        subdomain
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refresh',
  [body('refresh_token').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { refresh_token } = req.body;

      const result = await AuthService.refreshAccessToken(refresh_token);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logout',
  [body('refresh_token').notEmpty()],
  async (req, res, next) => {
    try {
      const { refresh_token } = req.body;

      await AuthService.logout(refresh_token);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
