import { Router } from 'express';

import { sendBatchApplications, getDashboardStats } from '../controllers/jobApplicationController.js';
import { authenticateAdmin } from '../middlewares/auth.js';
const router = Router();

router.post('/send-applications', authenticateAdmin, sendBatchApplications);
router.get('/dashboard-stats', authenticateAdmin, getDashboardStats);


export default router;