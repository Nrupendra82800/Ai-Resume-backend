import express from 'express';
import { getSubscription, upgradeToPro, cancelSubscription } from '../controllers/subscription.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();
router.use(protect);
router.get('/', getSubscription);
router.post('/upgrade', upgradeToPro);
router.post('/cancel', cancelSubscription);
export default router;
