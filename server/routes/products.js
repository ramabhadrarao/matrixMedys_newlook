import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { 
  uploadDocument, 
  uploadMixedFiles,
  handleUploadError 
} from '../middleware/upload.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductDocument,
  deleteProductDocument,
  getProductsByCategory
} from '../controllers/productController.js';

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('code').trim().isLength({ min: 2 }).withMessage('Product code must be at least 2 characters'),
  body('category').isMongoId().withMessage('Valid category ID required'),
  body('gstPercentage').isFloat({ min: 0, max: 100 }).withMessage('GST percentage must be between 0 and 100'),
  body('specification').optional().trim(),
  body('remarks').optional().trim(),
  body('unit').optional().isIn(['PCS', 'BOX', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'CM', 'DOZEN', 'PACK']).withMessage('Invalid unit'),
  body('hsnCode').optional().trim(),
  body('barcode').optional().trim()
];

// Routes
router.get('/', authenticate, checkPermission('products', 'view'), getProducts);
router.get('/category/:categoryId', authenticate, checkPermission('products', 'view'), getProductsByCategory);
router.get('/:id', authenticate, checkPermission('products', 'view'), getProduct);

// Create product with file upload support
router.post('/', 
  authenticate, 
  checkPermission('products', 'create'),
  uploadMixedFiles,
  handleUploadError,
  productValidation, 
  validate, 
  createProduct
);

// Update product with file upload support
router.put('/:id', 
  authenticate, 
  checkPermission('products', 'update'),
  uploadMixedFiles,
  handleUploadError,
  productValidation, 
  validate, 
  updateProduct
);

router.delete('/:id', authenticate, checkPermission('products', 'delete'), deleteProduct);

// Document management
router.post('/:id/documents', 
  authenticate, 
  checkPermission('products', 'update'),
  uploadDocument,
  handleUploadError,
  addProductDocument
);

router.delete('/:id/documents/:documentId', 
  authenticate, 
  checkPermission('products', 'update'), 
  deleteProductDocument
);

export default router;