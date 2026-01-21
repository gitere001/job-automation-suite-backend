import { Router } from 'express';
import { scrapeAllJobBoards, scrapeAllCompanies } from '../controllers/jobscrapingController.js';

const router = Router();

router.get('/job-boards', scrapeAllJobBoards);
router.get('/companies', scrapeAllCompanies);

export default router;