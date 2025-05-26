import { Router } from 'express';
import { getBooks, getBookById, addBook, updateBook, deleteBook } from '../controllers/bookController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Tüm book route'ları için auth kullan
router.use(authenticate);

// Book routes
router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/', addBook);
router.put('/:id', updateBook);
router.delete('/:id', deleteBook);

export default router; 