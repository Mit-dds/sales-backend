import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import isAdmin from '../middlewares/isAdmin.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import parseNestedSubtypes from '../middlewares/parse-nested-subtypes.js';
import {
  createUnitType,
  getUnitType,
  updateUnitType,
  deleteUnitType,
  getAllUnitTypes,
  deleteSubType,
  batchUpdateSubTypes,
  getTemplatePlans,
  savePaymentPlans,
  getPaymentPlan,
  createPaymentPlan,
  updatePaymentPlan,
  deletePaymentPlan,
  uploadFloorPlan,
  deleteFloorPlan,
  getFloorPlans,
} from '../controllers/unit-types.controller.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Step 1: Get all unit types summary (must be before /:unitTypeId to avoid param matching)
router.get('/', isAdmin, getAllUnitTypes);

// Step 2: Create unit type with subtypes
router.post('/', isAdmin, upload.any(), parseNestedSubtypes, createUnitType);

// Step 3: Get/Update/Delete a unit type (must be before more specific :unitTypeId/* routes)
router.get('/:unitTypeId', isAdmin, getUnitType);
router.put('/:unitTypeId', isAdmin, updateUnitType);
router.delete('/:unitTypeId', isAdmin, deleteUnitType);

// Step 4: SubType management (batch update + delete)
router.put('/:unitTypeId/subtypes', isAdmin, upload.any(), parseNestedSubtypes, batchUpdateSubTypes);
router.delete('/:unitTypeId/subtypes/:subTypeId', isAdmin, deleteSubType);

// Step 5: Floor Plans (all subtypes — must be before other :unitTypeId/* paths)
router.get('/:unitTypeId/floor-plans', isAdmin, getFloorPlans);

// Step 6: Payment Plans
router.get('/:unitTypeId/payment-plans/templates', isAdmin, getTemplatePlans);  // must be before :planId
router.get('/:unitTypeId/payment-plans/:planId', isAdmin, getPaymentPlan);
router.post('/:unitTypeId/payment-plans', isAdmin, savePaymentPlans);          // bulk replace
router.post('/:unitTypeId/payment-plans/save', isAdmin, createPaymentPlan);    // single create
router.put('/:unitTypeId/payment-plans/:planId', isAdmin, updatePaymentPlan);
router.delete('/:unitTypeId/payment-plans/:planId', isAdmin, deletePaymentPlan);

// Step 7: Floor Plans (per subtype)
router.post('/:unitTypeId/subtypes/:subTypeId/floor-plan', isAdmin, upload.single('file'), uploadFloorPlan);
router.delete('/:unitTypeId/subtypes/:subTypeId/floor-plan', isAdmin, deleteFloorPlan);

export default router;
