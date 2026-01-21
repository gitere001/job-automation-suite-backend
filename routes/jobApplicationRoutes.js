import { Router } from 'express';

import { sendBatchApplications, getDashboardStats } from '../controllers/jobApplicationController.js';

const router = Router();

router.post('/send-applications', sendBatchApplications);
router.get('/dashboard-stats', getDashboardStats);


export default router;