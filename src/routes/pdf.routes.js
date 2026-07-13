import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { generateOfferPdf, previewOfferPdf } from '../controllers/pdf.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/generate', generateOfferPdf);
router.post('/preview', previewOfferPdf);

export default router;
