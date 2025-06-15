import { Router } from 'express';
import { register, login, getProfile, checkUsername, searchByUsername } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes - authentication gerektirmeyen
console.log('🔧 Setting up public auth routes...');
router.post('/register', register);
router.post('/login', login);
router.get('/check-username/:username', checkUsername);

// Protected routes - authentication gerektiren
console.log('🔒 Setting up protected auth routes...');
router.get('/profile', authenticate, getProfile);
router.get('/search/:username', authenticate, searchByUsername);

console.log('✅ Auth routes setup completed');

export default router; 