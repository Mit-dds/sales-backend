import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import isAdmin from '../middlewares/isAdmin.middleware.js';

const router = Router();

router.get('/users', authMiddleware, isAdmin, adminController.getUsers);
router.get('/users/:userId', authMiddleware, isAdmin, adminController.getUserById);
router.patch('/users/:userId/status', authMiddleware, isAdmin, adminController.updateUserStatus);

export default router;
