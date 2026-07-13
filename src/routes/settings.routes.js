import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import isAdmin from '../middlewares/isAdmin.middleware.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', isAdmin, updateSettings);

export default router;
