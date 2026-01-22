import { Router } from 'express';

import { sendBatchApplications,
	getDashboardStats,
	getApplications,
	addManualApplication,
	updateResponseStatus,
	deleteApplication
 } from '../controllers/jobApplicationController.js';
import { authenticateAdmin } from '../middlewares/auth.js';
const router = Router();

router.post('/send-applications', authenticateAdmin, sendBatchApplications);
router.get('/dashboard-stats', authenticateAdmin, getDashboardStats);
router.get('/applications', authenticateAdmin, getApplications);
router.put('/applications/:id', authenticateAdmin, updateResponseStatus);
router.delete('/applications/:id', authenticateAdmin, deleteApplication);
router.post('/applications/manual', authenticateAdmin, addManualApplication);

export default router;