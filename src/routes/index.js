import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import projectsRoutes from './projects.routes.js';
import unitTypesRoutes from './unit-types.routes.js';
import availabilityRoutes from './availability.routes.js';
import offersRoutes from './offers.routes.js';
import settingsRoutes from './settings.routes.js';
import pdfRoutes from './pdf.routes.js';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectsRoutes);
router.use('/projects/:projectId/unit-types', unitTypesRoutes);
router.use('/availability', availabilityRoutes);
router.use('/offers', offersRoutes);
router.use('/settings', settingsRoutes);
router.use('/pdf', pdfRoutes);

export default router;
