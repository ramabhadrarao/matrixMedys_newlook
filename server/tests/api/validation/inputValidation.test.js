// tests/api/validation/inputValidation.test.js
import request from 'supertest';
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  validateQCCreation,
  validateQCUpdate,
  validateWarehouseApprovalCreation,
  validateWarehouseApprovalUpdate,
  validateInventoryUpdate,
  validateBulkOperation,
  validatePagination,
  validateDateRange,
  handleValidationErrors
} from '../../../middleware/validation.js';
import {
  createTestUser,
  generateJWTToken,
  cleanupTestData
} from '../../helpers/testHelpers.js';

// Create test app with validation middleware
const createValidationTestApp = (validationMiddleware) => {
  const app = express();
  app.use(express.json());
  
  // Add validation middleware
  if (Array.isArray(validationMiddleware)) {
    validationMiddleware.forEach(middleware => app.use(middleware));
  } else {
    app.use(validationMiddleware);
  }
  
  // Add error handling
  app.use(handleValidationErrors);
  
  // Test route
  app.post('/test', (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.get('/test', (req, res) => {
    res.json({ success: true, query: req.query, params: req.params });
  });
  
  app.put('/test/:id', (req, res) => {
    res.json({ success: true, id: req.params.id, data: req.body });
  });
  
  return app;
};

describe('Input Validation Tests', () => {
  let testUser, userToken;

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    userToken = generateJWTToken(testUser);
  });

  describe('QC Creation Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateQCCreation);
    });

    it('should accept valid QC creation data', async () => {
      const validData = {
        qcType: 'incoming',
        priority: 'high',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending'
          }]
        }],
        assignedTo: '507f1f77bcf86cd799439012',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test QC record'
      };

      const response = await request(app)
        .post('/test')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject QC creation without required fields', async () => {
      const invalidData = {
        priority: 'high'
        // Missing qcType, products
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'qcType',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should reject invalid qcType values', async () => {
      const invalidData = {
        qcType: 'invalid_type',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{ itemId: 'ITEM001', quantity: 50, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'qcType',
          message: expect.stringContaining('must be one of')
        })
      );
    });

    it('should reject invalid priority values', async () => {
      const invalidData = {
        qcType: 'incoming',
        priority: 'invalid_priority',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{ itemId: 'ITEM001', quantity: 50, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'priority',
          message: expect.stringContaining('must be one of')
        })
      );
    });

    it('should reject empty products array', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: []
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products',
          message: expect.stringContaining('at least one product')
        })
      );
    });

    it('should validate product structure', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          // Missing required fields
          batchNumber: 'BATCH001'
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].product',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should validate item structure within products', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{
            // Missing required fields
            quantity: 50
          }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].items[0].itemId',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should validate MongoDB ObjectId format', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          product: 'invalid_id',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{ itemId: 'ITEM001', quantity: 50, status: 'pending' }]
        }],
        assignedTo: 'invalid_id'
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].product',
          message: expect.stringContaining('valid MongoDB ObjectId')
        })
      );
    });

    it('should validate date formats', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{ itemId: 'ITEM001', quantity: 50, status: 'pending' }]
        }],
        dueDate: 'invalid_date'
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'dueDate',
          message: expect.stringContaining('valid date')
        })
      );
    });

    it('should validate numeric values', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: 'BATCH001',
          quantity: 'not_a_number',
          items: [{ itemId: 'ITEM001', quantity: 'not_a_number', status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].quantity',
          message: expect.stringContaining('number')
        })
      );
    });
  });

  describe('QC Update Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateQCUpdate);
    });

    it('should accept valid QC update data', async () => {
      const validData = {
        status: 'in_progress',
        priority: 'medium',
        inspectionResults: {
          overallResult: 'pass',
          notes: 'All items passed inspection',
          inspectedBy: '507f1f77bcf86cd799439012',
          inspectionDate: new Date().toISOString()
        },
        products: [{
          product: '507f1f77bcf86cd799439011',
          items: [{
            itemId: 'ITEM001',
            status: 'approved',
            qcResult: 'pass',
            notes: 'Item passed all tests'
          }]
        }]
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid status values', async () => {
      const invalidData = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'status',
          message: expect.stringContaining('must be one of')
        })
      );
    });

    it('should validate inspection results structure', async () => {
      const invalidData = {
        inspectionResults: {
          overallResult: 'invalid_result'
        }
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'inspectionResults.overallResult',
          message: expect.stringContaining('must be one of')
        })
      );
    });

    it('should validate product item updates', async () => {
      const invalidData = {
        products: [{
          product: '507f1f77bcf86cd799439011',
          items: [{
            itemId: 'ITEM001',
            status: 'invalid_status'
          }]
        }]
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].items[0].status',
          message: expect.stringContaining('must be one of')
        })
      );
    });
  });

  describe('Warehouse Approval Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateWarehouseApprovalCreation);
    });

    it('should accept valid warehouse approval creation data', async () => {
      const validData = {
        qcRecord: '507f1f77bcf86cd799439011',
        warehouse: '507f1f77bcf86cd799439012',
        priority: 'high',
        products: [{
          product: '507f1f77bcf86cd799439013',
          batchNumber: 'BATCH001',
          quantity: 100,
          storageLocation: 'A1-B2-C3',
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending',
            storageLocation: 'A1-B2-C3-01'
          }]
        }],
        assignedTo: '507f1f77bcf86cd799439014',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/test')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject warehouse approval without required QC record', async () => {
      const invalidData = {
        warehouse: '507f1f77bcf86cd799439012',
        products: [{
          product: '507f1f77bcf86cd799439013',
          batchNumber: 'BATCH001',
          quantity: 100,
          items: [{ itemId: 'ITEM001', quantity: 50, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'qcRecord',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should validate storage location format', async () => {
      const invalidData = {
        qcRecord: '507f1f77bcf86cd799439011',
        warehouse: '507f1f77bcf86cd799439012',
        products: [{
          product: '507f1f77bcf86cd799439013',
          batchNumber: 'BATCH001',
          quantity: 100,
          storageLocation: '', // Empty storage location
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending',
            storageLocation: 'INVALID_FORMAT'
          }]
        }]
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'products[0].storageLocation',
          message: expect.stringContaining('required')
        })
      );
    });
  });

  describe('Inventory Update Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateInventoryUpdate);
    });

    it('should accept valid inventory update data', async () => {
      const validData = {
        quantity: 100,
        reservedQuantity: 20,
        location: 'A1-B2-C3',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Updated inventory'
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject negative quantities', async () => {
      const invalidData = {
        quantity: -10,
        reservedQuantity: -5
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'quantity',
          message: expect.stringContaining('greater than or equal to 0')
        })
      );
    });

    it('should validate expiry date is in future', async () => {
      const invalidData = {
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const response = await request(app)
        .put('/test/507f1f77bcf86cd799439011')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'expiryDate',
          message: expect.stringContaining('future date')
        })
      );
    });
  });

  describe('Bulk Operation Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateBulkOperation);
    });

    it('should accept valid bulk operation data', async () => {
      const validData = {
        ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        operation: 'approve',
        data: {
          approvedBy: '507f1f77bcf86cd799439013',
          notes: 'Bulk approval'
        }
      };

      const response = await request(app)
        .post('/test')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject empty IDs array', async () => {
      const invalidData = {
        ids: [],
        operation: 'approve'
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'ids',
          message: expect.stringContaining('at least one ID')
        })
      );
    });

    it('should validate maximum number of IDs', async () => {
      const invalidData = {
        ids: Array(101).fill().map((_, i) => `507f1f77bcf86cd79943901${i.toString().padStart(1, '0')}`),
        operation: 'approve'
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'ids',
          message: expect.stringContaining('maximum of 100')
        })
      );
    });

    it('should validate operation type', async () => {
      const invalidData = {
        ids: ['507f1f77bcf86cd799439011'],
        operation: 'invalid_operation'
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'operation',
          message: expect.stringContaining('must be one of')
        })
      );
    });
  });

  describe('Pagination Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validatePagination);
    });

    it('should accept valid pagination parameters', async () => {
      const response = await request(app)
        .get('/test?page=2&limit=20&sort=createdAt&order=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should use default values for missing pagination parameters', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid page numbers', async () => {
      const response = await request(app)
        .get('/test?page=0')
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'page',
          message: expect.stringContaining('greater than or equal to 1')
        })
      );
    });

    it('should reject invalid limit values', async () => {
      const response = await request(app)
        .get('/test?limit=101')
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'limit',
          message: expect.stringContaining('less than or equal to 100')
        })
      );
    });

    it('should validate sort order values', async () => {
      const response = await request(app)
        .get('/test?order=invalid')
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'order',
          message: expect.stringContaining('must be one of')
        })
      );
    });
  });

  describe('Date Range Validation', () => {
    let app;

    beforeEach(() => {
      app = createValidationTestApp(validateDateRange);
    });

    it('should accept valid date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/test?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid date formats', async () => {
      const response = await request(app)
        .get('/test?startDate=invalid_date')
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'startDate',
          message: expect.stringContaining('valid date')
        })
      );
    });

    it('should reject end date before start date', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/test?startDate=${startDate}&endDate=${endDate}`)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'endDate',
          message: expect.stringContaining('after start date')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const app = express();
      app.use(express.json());
      
      // Add validation that will fail
      app.post('/test', [
        body('email').isEmail(),
        body('age').isInt({ min: 0, max: 120 })
      ], handleValidationErrors, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'invalid_email', age: -5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveLength(2);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('valid email')
        })
      );
    });

    it('should handle malformed JSON', async () => {
      const app = express();
      app.use(express.json());
      app.use(handleValidationErrors);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing content type', async () => {
      const app = express();
      app.use(express.json());
      app.use(validateQCCreation);
      app.use(handleValidationErrors);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send('plain text data')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Validation', () => {
    it('should sanitize input to prevent XSS', async () => {
      const app = createValidationTestApp(validateQCCreation);

      const maliciousData = {
        qcType: 'incoming',
        products: [{
          product: '507f1f77bcf86cd799439011',
          batchNumber: '<script>alert("xss")</script>',
          quantity: 100,
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending'
          }]
        }],
        notes: '<img src="x" onerror="alert(\'xss\')">'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData)
        .expect(200);

      // Should sanitize the malicious content
      expect(response.body.data.products[0].batchNumber).not.toContain('<script>');
      expect(response.body.data.notes).not.toContain('onerror');
    });

    it('should validate against SQL injection patterns', async () => {
      const app = createValidationTestApp([
        query('search').escape(),
        handleValidationErrors
      ]);

      const response = await request(app)
        .get('/test?search=\'; DROP TABLE users; --')
        .expect(200);

      expect(response.body.query.search).not.toContain('DROP TABLE');
    });

    it('should limit input length to prevent DoS', async () => {
      const app = createValidationTestApp([
        body('notes').isLength({ max: 1000 }),
        handleValidationErrors
      ]);

      const longString = 'a'.repeat(1001);

      const response = await request(app)
        .post('/test')
        .send({ notes: longString })
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'notes',
          message: expect.stringContaining('maximum length')
        })
      );
    });
  });
});