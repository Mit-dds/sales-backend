import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import isAdmin from '../middlewares/isAdmin.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import {
  createProject, getAllProjects, getProjectById, updateProject, deleteProject,
  uploadProjectFile, deleteProjectFile, getMasterPlan,
  getWhyBuy, addWhyBuyItem, removeWhyBuyItem, getWhyBuyAISuggestions,
} from '../controllers/projects.controller.js';

const router = Router();

router.use(authMiddleware);

// CRUD
router.get('/', getAllProjects);
router.get('/:projectId', getProjectById);
router.post('/', isAdmin, createProject);
router.put('/:projectId', isAdmin, updateProject);
router.delete('/:projectId', isAdmin, deleteProject);

// Upload routes (hero image, master plan)
router.post('/:projectId/upload', isAdmin, (req, res, next) => {
  const type = req.query.type || 'images';
  const uploadMiddleware = upload.single('file');
  uploadMiddleware(req, res, (err) => {
    if (err) return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    next();
  });
}, uploadProjectFile);

// Delete routes (consolidated with ?type=hero|master-plan)
router.delete('/:projectId/file', isAdmin, deleteProjectFile);

// Master Plan & Hero (GET)
router.get('/:projectId/master-plan', getMasterPlan);

// Why Buy
router.get('/:projectId/why-buy', getWhyBuy);
router.post('/:projectId/why-buy', isAdmin, addWhyBuyItem);
router.get('/:projectId/why-buy/ai-suggestions', getWhyBuyAISuggestions);  // must be before :index
router.delete('/:projectId/why-buy/:index', isAdmin, removeWhyBuyItem);

export default router;
