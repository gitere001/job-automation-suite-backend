import { Router } from 'express';

import { sendBatchApplications } from '../controllers/jobApplicationController.js';

const router = Router();

router.post('/send-applications', sendBatchApplications);


export default router;