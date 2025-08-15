import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  getCategoryProducts
} from '../controllers/categoryController.js';

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
  body('description').optional().trim(),
  body('principal').isMongoId().withMessage('Valid principal ID required'),
  body('portfolio').isMongoId().withMessage('Valid portfolio ID required'),
  body('parent').optional().isMongoId().withMessage('Valid parent category ID required'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a positive number')
];

// Routes
router.get('/', authenticate, checkPermission('categories', 'view'), getCategories);
router.get('/tree/:principalId/:portfolioId', authenticate, checkPermission('categories', 'view'), getCategoryTree);
router.get('/:id', authenticate, checkPermission('categories', 'view'), getCategory);
router.get('/:id/products', authenticate, checkPermission('categories', 'view'), getCategoryProducts);
router.post('/', authenticate, checkPermission('categories', 'create'), categoryValidation, validate, createCategory);
router.put('/:id', authenticate, checkPermission('categories', 'update'), categoryValidation, validate, updateCategory);
router.put('/:id/move', authenticate, checkPermission('categories', 'update'), moveCategory);
router.delete('/:id', authenticate, checkPermission('categories', 'delete'), deleteCategory);

export default router;