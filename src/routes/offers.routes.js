import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { createOffer, listOffers } from '../controllers/offers.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createOffer);
router.get('/', listOffers);

export default router;
