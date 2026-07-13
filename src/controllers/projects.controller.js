import * as projectsService from '../services/projects.service.js';
import * as aiService from '../services/ai.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { validateProjectInput, validateProjectUpdateInput, validateWhyBuyItems } from '../validators/projects.validator.js';

// ---------- Create Project ----------

export const createProject = asyncHandler(async (req, res) => {
  const data = validateProjectInput(req.body);
  const project = await projectsService.createProject(data);
  res.status(201).json({ success: true, data: { project } });
});

// ---------- Get All Projects ----------

export const getAllProjects = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { search, status } = req.query;

  const result = await projectsService.getAllProjects({ page, limit, search, status });
  res.json({ success: true, data: result });
});

// ---------- Get Project By Id ----------

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectsService.getProjectById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ success: true, data: { project } });
});

// ---------- Update Project ----------

export const updateProject = asyncHandler(async (req, res) => {
  const data = validateProjectUpdateInput(req.body);
  if (Object.keys(data).length === 0) throw new ApiError(400, 'No fields to update');
  const project = await projectsService.updateProject(req.params.projectId, data);
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ success: true, data: { project } });
});

// ---------- Delete Project ----------

export const deleteProject = asyncHandler(async (req, res) => {
  const result = await projectsService.deleteProject(req.params.projectId);
  if (!result) throw new ApiError(404, 'Project not found');
  res.json({ success: true, message: 'Project deleted successfully' });
});

// ---------- Upload File (hero / master-plan) ----------

export const uploadProjectFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const { projectId } = req.params;
  const type = req.query.type;

  if (!type || !['hero', 'master-plan'].includes(type)) {
    throw new ApiError(400, 'Invalid upload type. Must be "hero" or "master-plan"');
  }

  const project = await projectsService.uploadProjectFile(projectId, type, req.file);
  if (!project) throw new ApiError(404, 'Project not found');

  res.json({ success: true, data: { project } });
});

// ---------- Delete File (hero / master-plan) ----------

export const deleteProjectFile = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const type = req.query.type;

  if (!type || !['hero', 'master-plan'].includes(type)) {
    throw new ApiError(400, 'Invalid type. Must be "hero" or "master-plan"');
  }

  const project = await projectsService.deleteProjectFile(projectId, type);
  if (!project) throw new ApiError(404, 'Project not found');

  res.json({ success: true, data: { project } });
});

// ---------- Get Master Plan ----------

export const getMasterPlan = asyncHandler(async (req, res) => {
  const masterPlan = await projectsService.getMasterPlan(req.params.projectId);
  if (!masterPlan) throw new ApiError(404, 'Project not found');
  res.json({ success: true, data: masterPlan });
});

// ---------- Get Why Buy ----------

export const getWhyBuy = asyncHandler(async (req, res) => {
  const whyBuy = await projectsService.getWhyBuy(req.params.projectId);
  if (!whyBuy) throw new ApiError(404, 'Project not found');
  res.json({ success: true, data: { whyBuy } });
});

// ---------- Replace Why Buy Items (POST - batch replace) ----------

export const addWhyBuyItem = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const items = validateWhyBuyItems(req.body);

  const project = await projectsService.addWhyBuyItem(projectId, items);
  if (!project) throw new ApiError(404, 'Project not found');

  res.status(201).json({ success: true, data: { project } });
});

// ---------- Remove Why Buy Item (DELETE - by index) ----------

export const removeWhyBuyItem = asyncHandler(async (req, res) => {
  const { projectId, index } = req.params;
  const idx = parseInt(index, 10);
  if (isNaN(idx) || idx < 0) throw new ApiError(400, 'Invalid index');

  const project = await projectsService.removeWhyBuyItem(projectId, idx);
  if (!project) throw new ApiError(404, 'Project not found');

  res.json({ success: true, data: { project } });
});

// ---------- Get Why Buy AI Suggestions ----------

export const getWhyBuyAISuggestions = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const suggestions = await aiService.generateWhyBuySuggestions(projectId);
  res.json({ success: true, data: { suggestions } });
});
