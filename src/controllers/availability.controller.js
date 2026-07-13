import * as availabilityService from '../services/availability.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateImportFile } from '../validators/availability.validator.js';


export const importAvailability = asyncHandler(async (req, res) => {
  validateImportFile(req.file);
  const result = await availabilityService.importFromExcel(req.file);
  res.status(201).json({ success: true, data: result });
});

export const getProjectsWithUnits = asyncHandler(async (req, res) => {
  const projects = await availabilityService.getProjectsWithUnits();
  res.json({ success: true, data: { projects } });
});

export const getUnitsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { search, unitType } = req.query;
  const result = await availabilityService.getProjectUnits(projectId, { search, unitType });
  if (!result) return res.status(404).json({ success: false, message: 'Project not found or has no units' });
  res.json({ success: true, data: result });
});

export const getPaymentPlansForUnit = asyncHandler(async (req, res) => {
  const { projectId, unitId } = req.params;
  const result = await availabilityService.getUnitPaymentPlans(projectId, unitId);
  if (!result) return res.status(404).json({ success: false, message: 'Unit not found or does not belong to this project' });
  res.json({ success: true, data: result });
});

export const clearAvailability = asyncHandler(async (_req, res) => {
  await availabilityService.deleteAll();
  res.json({ success: true, message: 'All availability data cleared' });
});
