// server/routes/portfolios.js
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioStats,
} from '../controllers/portfolioController.js';

const router = express.Router();

// Validation rules
const portfolioValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Portfolio name must be at least 2 characters'),
  body('description').trim().isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
];

// Routes
router.get('/', authenticate, getPortfolios);
router.get('/stats', authenticate, checkPermission('portfolios', 'view'), getPortfolioStats);
router.get('/:id', authenticate, getPortfolio);
router.post('/', authenticate, checkPermission('portfolios', 'create'), portfolioValidation, validate, createPortfolio);
router.put('/:id', authenticate, checkPermission('portfolios', 'update'), portfolioValidation, validate, updatePortfolio);
router.delete('/:id', authenticate, checkPermission('portfolios', 'delete'), deletePortfolio);

export default router;