import { Router } from 'express';
import { login, getAdminProfile, logout } from '../controllers/authController.js';
import { authenticateAdmin } from '../middlewares/auth.js';



const router = Router();

router.post('/login', login);
router.get('/get-profile', authenticateAdmin, getAdminProfile);
router.post('/logout', logout);

export default router;