import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import isAdmin from '../middlewares/isAdmin.middleware.js';
import { uploadExcel } from '../middlewares/upload.middleware.js';
import {
  importAvailability,
  getProjectsWithUnits,
  getUnitsByProject,
  getPaymentPlansForUnit,
  clearAvailability,
} from '../controllers/availability.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/projects', getProjectsWithUnits);
router.get('/:projectId/units', getUnitsByProject);
router.get('/:projectId/units/:unitId/payment-plans', getPaymentPlansForUnit);

router.post('/import', isAdmin, uploadExcel.single('file'), importAvailability);

router.delete('/', isAdmin, clearAvailability);

export default router;
