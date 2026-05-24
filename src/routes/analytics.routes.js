import express from 'express';
import { getMyAnalytics, getAdminAnalytics } from '../controllers/analytics.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
const router = express.Router();
router.get('/me', protect, getMyAnalytics);
router.get('/admin', adminOnly, getAdminAnalytics);
export default router;
