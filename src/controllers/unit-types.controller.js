import * as unitTypesService from '../services/unit-types.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateCreateUnitType, validateUpdateUnitType, validateBatchUpdateSubTypes, validatePaymentPlans, validatePaymentPlanInput } from '../validators/unit-types.validator.js';

// ---------- API 1: Create Unit Type ----------

export const createUnitType = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const data = validateCreateUnitType(req.body);
  const unitType = await unitTypesService.createUnitType(projectId, data);
  res.status(201).json({ success: true, data: { unitType } });
});

// ---------- API 2: Get Unit Type ----------

export const getUnitType = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const unitType = await unitTypesService.getUnitType(projectId, unitTypeId);
  res.json({ success: true, data: { unitType } });
});

// ---------- API 3: Update Unit Type (label/virtualTour only) ----------

export const updateUnitType = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const data = validateUpdateUnitType(req.body);
  const unitType = await unitTypesService.updateUnitType(projectId, unitTypeId, data);
  res.json({ success: true, data: { unitType } });
});

// ---------- API 4: Delete Unit Type ----------

export const deleteUnitType = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  await unitTypesService.deleteUnitType(projectId, unitTypeId);
  res.json({ success: true, message: 'Unit type deleted' });
});

// ---------- API 5: Get All Unit Types (Summary) ----------

export const getAllUnitTypes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const unitTypes = await unitTypesService.getAllUnitTypes(projectId);
  res.json({ success: true, data: { unitTypes } });
});

// ---------- API 6: Delete SubType ----------

export const deleteSubType = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, subTypeId } = req.params;
  await unitTypesService.deleteSubType(projectId, unitTypeId, subTypeId);
  res.json({ success: true, message: 'Subtype deleted' });
});

// ---------- API 7: Batch Update SubTypes ----------

export const batchUpdateSubTypes = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const data = validateBatchUpdateSubTypes(req.body);
  const subtypes = await unitTypesService.batchUpdateSubTypes(projectId, unitTypeId, data);
  res.json({ success: true, data: { subtypes } });
});

// ---------- API 8: Get Template Plans ----------

export const getTemplatePlans = asyncHandler(async (_req, res) => {
  const templates = await unitTypesService.getTemplatePlans();
  res.json({ success: true, data: { templates } });
});

// ---------- API 9: Save Payment Plans ----------

export const savePaymentPlans = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const { plans } = validatePaymentPlans(req.body);
  const saved = await unitTypesService.savePaymentPlans(projectId, unitTypeId, plans);
  res.json({ success: true, data: { plans: saved } });
});

// ---------- API 10: Get Single Payment Plan ----------

export const getPaymentPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, planId } = req.params;
  const plan = await unitTypesService.getPaymentPlan(projectId, unitTypeId, planId);
  res.json({ success: true, data: { plan } });
});

// ---------- API 11: Create Single Payment Plan ----------

export const createPaymentPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const data = validatePaymentPlanInput(req.body);
  const plan = await unitTypesService.createPaymentPlan(projectId, unitTypeId, data);
  res.status(201).json({ success: true, data: { plan } });
});

// ---------- API 12: Update Single Payment Plan ----------

export const updatePaymentPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, planId } = req.params;
  const data = validatePaymentPlanInput(req.body);
  const plan = await unitTypesService.updatePaymentPlan(projectId, unitTypeId, planId, data);
  res.json({ success: true, data: { plan } });
});

// ---------- API 13: Delete Single Payment Plan ----------

export const deletePaymentPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, planId } = req.params;
  await unitTypesService.deletePaymentPlan(projectId, unitTypeId, planId);
  res.json({ success: true, message: 'Payment plan deleted' });
});

// ---------- API 14: Upload Floor Plan ----------

export const uploadFloorPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, subTypeId } = req.params;
  const file = req.file;
  const subtype = await unitTypesService.uploadFloorPlan(projectId, unitTypeId, subTypeId, file);
  res.json({ success: true, data: { subtype } });
});

// ---------- API 15: Delete Floor Plan ----------

export const deleteFloorPlan = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId, subTypeId } = req.params;
  const subtype = await unitTypesService.deleteFloorPlan(projectId, unitTypeId, subTypeId);
  res.json({ success: true, data: { subtype } });
});

// ---------- API 16: Get Floor Plans (All Subtypes) ----------

export const getFloorPlans = asyncHandler(async (req, res) => {
  const { projectId, unitTypeId } = req.params;
  const floorPlans = await unitTypesService.getFloorPlans(projectId, unitTypeId);
  res.json({ success: true, data: { floorPlans } });
});
