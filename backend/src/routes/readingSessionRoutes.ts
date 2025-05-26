import { Router } from 'express';
import { startSession, endSession, getSessions } from '../controllers/readingSessionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Tüm session route'ları için auth kullan
router.use(authenticate);

// Session routes
router.get('/', getSessions);
router.post('/start', startSession);
router.post('/end', endSession);

export default router; 