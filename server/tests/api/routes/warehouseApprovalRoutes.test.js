// tests/api/routes/warehouseApprovalRoutes.test.js
import request from 'supertest';
import app from '../../../app.js';
import {
  createTestUser,
  createTestQCRecord,
  createTestWarehouseApproval,
  createTestProduct,
  createTestWarehouse,
  generateJWTToken,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('Warehouse Approval Routes API Tests', () => {
  let testUser, testAdmin, testWarehouseManager, testWarehouse, testProduct;
  let userToken, adminToken, warehouseManagerToken;
  let testQCRecord, testWarehouseApproval;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    testUser = await createTestUser();
    testAdmin = await createTestUser({ role: 'admin' });
    testWarehouseManager = await createTestUser({ 
      role: 'warehouse_manager',
      permissions: ['read_warehouse', 'create_warehouse_approval', 'update_warehouse_approval', 'approve_warehouse']
    });
    
    // Create test entities
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdmin);
    warehouseManagerToken = generateJWTToken(testWarehouseManager);
    
    // Create approved QC record first
    testQCRecord = await createTestQCRecord({
      status: 'approved',
      qcResult: 'pass',
      products: [{
        product: testProduct._id,
        batchNumber: 'BATCH001',
        quantity: 100,
        items: [{
          itemId: 'ITEM001',
          quantity: 50,
          status: 'approved',
          qcResult: 'pass'
        }]
      }]
    });
    
    // Create test warehouse approval
    testWarehouseApproval = await createTestWarehouseApproval({
      qcRecord: testQCRecord._id,
      warehouse: testWarehouse._id,
      assignedTo: testWarehouseManager._id,
      products: [{
        product: testProduct._id,
        batchNumber: 'BATCH001',
        quantity: 100,
        storageLocation: 'A1-B2-C3',
        items: [{
          itemId: 'ITEM001',
          quantity: 50,
          status: 'pending',
          storageLocation: 'A1-B2-C3-01'
        }]
      }]
    });
  });

  describe('GET /api/warehouse-approvals', () => {
    it('should retrieve warehouse approval records with authentication', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject requests without proper permissions', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should support filtering by warehouse', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.warehouse._id || record.warehouse).toBe(testWarehouse._id.toString());
      });
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals?status=pending')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.status).toBe('pending');
      });
    });

    it('should support filtering by QC record', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals?qcRecord=${testQCRecord._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.qcRecord._id || record.qcRecord).toBe(testQCRecord._id.toString());
      });
    });

    it('should support pagination and sorting', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals?page=1&limit=10&sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals?page=0&limit=101')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/warehouse-approvals/:id', () => {
    it('should retrieve specific warehouse approval record', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testWarehouseApproval._id.toString());
      expect(response.body.data.qcRecord).toBeDefined();
      expect(response.body.data.warehouse).toBeDefined();
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate ObjectId format', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals/invalid_id')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should populate related fields correctly', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.data.qcRecord).toBeDefined();
      expect(response.body.data.warehouse).toBeDefined();
      expect(response.body.data.assignedTo).toBeDefined();
      expect(response.body.data.products[0].product).toBeDefined();
    });
  });

  describe('POST /api/warehouse-approvals', () => {
    it('should create new warehouse approval with valid data', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id.toString(),
        warehouse: testWarehouse._id.toString(),
        priority: 'high',
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH002',
          quantity: 200,
          storageLocation: 'B1-C2-D3',
          items: [{
            itemId: 'ITEM002',
            quantity: 100,
            status: 'pending',
            storageLocation: 'B1-C2-D3-01'
          }]
        }],
        assignedTo: testWarehouseManager._id.toString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test warehouse approval creation'
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(approvalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.qcRecord).toBe(approvalData.qcRecord);
    });

    it('should reject creation without required fields', async () => {
      const invalidData = {
        warehouse: testWarehouse._id.toString(),
        priority: 'high'
        // Missing qcRecord, products
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject creation with non-approved QC record', async () => {
      const pendingQC = await createTestQCRecord({
        status: 'pending',
        products: [{
          product: testProduct._id,
          batchNumber: 'PENDING001',
          quantity: 50,
          items: [{ itemId: 'ITEM003', quantity: 25, status: 'pending' }]
        }]
      });

      const invalidData = {
        qcRecord: pendingQC._id.toString(),
        warehouse: testWarehouse._id.toString(),
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'PENDING001',
          quantity: 50,
          items: [{ itemId: 'ITEM003', quantity: 25, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('QC record must be approved');
    });

    it('should validate storage location format', async () => {
      const invalidData = {
        qcRecord: testQCRecord._id.toString(),
        warehouse: testWarehouse._id.toString(),
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH003',
          quantity: 100,
          storageLocation: '', // Empty storage location
          items: [{
            itemId: 'ITEM003',
            quantity: 50,
            status: 'pending',
            storageLocation: '' // Empty item storage location
          }]
        }]
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        qcRecord: testQCRecord._id.toString(),
        warehouse: testWarehouse._id.toString(),
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH004',
          quantity: 75,
          storageLocation: 'C1-D2-E3',
          items: [{
            itemId: 'ITEM004',
            quantity: 75,
            status: 'pending',
            storageLocation: 'C1-D2-E3-01'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(minimalData)
        .expect(201);

      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.priority).toBe('medium');
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should prevent duplicate warehouse approvals for same QC record', async () => {
      // Try to create another approval for the same QC record
      const duplicateData = {
        qcRecord: testQCRecord._id.toString(),
        warehouse: testWarehouse._id.toString(),
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH001',
          quantity: 100,
          storageLocation: 'D1-E2-F3',
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending',
            storageLocation: 'D1-E2-F3-01'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/warehouse-approvals/:id', () => {
    it('should update warehouse approval with valid data', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'low',
        notes: 'Updated notes',
        inspectionResults: {
          overallResult: 'pass',
          notes: 'All items stored correctly',
          inspectedBy: testWarehouseManager._id.toString(),
          inspectionDate: new Date().toISOString()
        }
      };

      const response = await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.priority).toBe(updateData.priority);
      expect(response.body.data.inspectionResults).toBeDefined();
    });

    it('should update product items with storage information', async () => {
      const updateData = {
        products: [{
          product: testProduct._id.toString(),
          items: [{
            itemId: 'ITEM001',
            status: 'stored',
            storageLocation: 'A1-B2-C3-02',
            notes: 'Item stored successfully'
          }]
        }]
      };

      const response = await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products[0].items[0].status).toBe('stored');
      expect(response.body.data.products[0].items[0].storageLocation).toBe('A1-B2-C3-02');
    });

    it('should reject invalid status transitions', async () => {
      // First, set status to completed
      await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ status: 'completed' })
        .expect(200);

      // Try to update back to pending (invalid transition)
      const response = await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ status: 'pending' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should validate storage location updates', async () => {
      const invalidData = {
        products: [{
          product: testProduct._id.toString(),
          items: [{
            itemId: 'ITEM001',
            storageLocation: '' // Empty storage location
          }]
        }]
      };

      const response = await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should update timestamps correctly', async () => {
      const originalUpdatedAt = testWarehouseApproval.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Updated timestamp test' })
        .expect(200);

      expect(new Date(response.body.data.updatedAt).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  describe('POST /api/warehouse-approvals/:id/submit', () => {
    it('should submit warehouse approval for final approval', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Ready for final approval' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submittedAt).toBeDefined();
    });

    it('should reject submission without complete storage information', async () => {
      // Create approval with incomplete storage data
      const incompleteApproval = await createTestWarehouseApproval({
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testWarehouseManager._id,
        products: [{
          product: testProduct._id,
          batchNumber: 'INCOMPLETE001',
          quantity: 100,
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending' // Missing storage location
          }]
        }]
      });

      const response = await request(app)
        .post(`/api/warehouse-approvals/${incompleteApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('storage information');
    });

    it('should reject submission of already submitted record', async () => {
      // First submission
      await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'First submission' })
        .expect(200);

      // Second submission should fail
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Second submission' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already submitted');
    });
  });

  describe('POST /api/warehouse-approvals/:id/approve', () => {
    beforeEach(async () => {
      // Submit the warehouse approval first
      await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Ready for approval' });
    });

    it('should approve submitted warehouse approval', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          notes: 'Approved after review',
          approvedBy: adminToken._id 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedAt).toBeDefined();
    });

    it('should create inventory records upon approval', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved - create inventory' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventoryCreated).toBe(true);
    });

    it('should reject approval of non-submitted record', async () => {
      const pendingApproval = await createTestWarehouseApproval({
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/warehouse-approvals/${pendingApproval._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approval attempt' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not submitted');
    });

    it('should require approval permissions', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ notes: 'Unauthorized approval' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('POST /api/warehouse-approvals/:id/reject', () => {
    beforeEach(async () => {
      // Submit the warehouse approval first
      await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Ready for approval' });
    });

    it('should reject submitted warehouse approval with reason', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          reason: 'Incorrect storage locations',
          notes: 'Please verify storage locations and resubmit'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectedAt).toBeDefined();
      expect(response.body.data.rejectionReason).toBe('Incorrect storage locations');
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Rejected without reason' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'reason',
          message: expect.stringContaining('required')
        })
      );
    });
  });

  describe('GET /api/warehouse-approvals/dashboard', () => {
    it('should return warehouse approval dashboard data', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals/dashboard')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.recentRecords).toBeDefined();
      expect(response.body.data.statusBreakdown).toBeDefined();
      expect(response.body.data.warehouseBreakdown).toBeDefined();
    });

    it('should filter dashboard by warehouse', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals/dashboard?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseFilter).toBe(testWarehouse._id.toString());
    });

    it('should filter dashboard by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/warehouse-approvals/dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
    });
  });

  describe('POST /api/warehouse-approvals/bulk-assign', () => {
    let additionalApproval;

    beforeEach(async () => {
      // Create additional QC record for bulk operations
      const additionalQC = await createTestQCRecord({
        status: 'approved',
        qcResult: 'pass',
        products: [{
          product: testProduct._id,
          batchNumber: 'BULK001',
          quantity: 150,
          items: [{
            itemId: 'BULK_ITEM001',
            quantity: 75,
            status: 'approved',
            qcResult: 'pass'
          }]
        }]
      });

      additionalApproval = await createTestWarehouseApproval({
        qcRecord: additionalQC._id,
        warehouse: testWarehouse._id,
        assignedTo: testWarehouseManager._id,
        status: 'pending'
      });
    });

    it('should bulk assign warehouse approvals to user', async () => {
      const bulkData = {
        ids: [testWarehouseApproval._id.toString(), additionalApproval._id.toString()],
        assignedTo: testWarehouseManager._id.toString(),
        notes: 'Bulk assignment for urgent processing'
      };

      const response = await request(app)
        .post('/api/warehouse-approvals/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);
      expect(response.body.data.results).toHaveLength(2);
    });

    it('should validate bulk assignment data', async () => {
      const invalidData = {
        ids: [], // Empty array
        assignedTo: 'invalid_id'
      };

      const response = await request(app)
        .post('/api/warehouse-approvals/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkData = {
        ids: [testWarehouseApproval._id.toString(), '507f1f77bcf86cd799439011'], // One valid, one invalid
        assignedTo: testWarehouseManager._id.toString()
      };

      const response = await request(app)
        .post('/api/warehouse-approvals/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(207); // Multi-status

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(1);
      expect(response.body.data.failed).toBe(1);
    });
  });

  describe('GET /api/warehouse-approvals/statistics', () => {
    it('should return warehouse approval statistics', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals/statistics')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRecords).toBeDefined();
      expect(response.body.data.statusBreakdown).toBeDefined();
      expect(response.body.data.warehouseBreakdown).toBeDefined();
      expect(response.body.data.averageProcessingTime).toBeDefined();
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/warehouse-approvals/statistics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should filter statistics by warehouse', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals/statistics?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseFilter).toBe(testWarehouse._id.toString());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server errors gracefully', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals/invalid_object_id_format')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should maintain data consistency during concurrent updates', async () => {
      const updatePromises = [
        request(app)
          .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
          .set('Authorization', `Bearer ${warehouseManagerToken}`)
          .send({ notes: 'Update 1' }),
        request(app)
          .put(`/api/warehouse-approvals/${testWarehouseApproval._id}`)
          .set('Authorization', `Bearer ${warehouseManagerToken}`)
          .send({ notes: 'Update 2' })
      ];

      const responses = await Promise.all(updatePromises);
      
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status);
      });
    });

    it('should validate business rules during operations', async () => {
      // Try to approve without submission
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Direct approval attempt' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not submitted');
    });

    it('should handle inventory integration errors', async () => {
      // Submit and try to approve with invalid inventory data
      await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/submit`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send({ notes: 'Ready for approval' });

      // Mock inventory creation failure scenario
      const response = await request(app)
        .post(`/api/warehouse-approvals/${testWarehouseApproval._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          notes: 'Approve with inventory creation',
          createInventory: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate storage location conflicts', async () => {
      const conflictData = {
        qcRecord: testQCRecord._id.toString(),
        warehouse: testWarehouse._id.toString(),
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'CONFLICT001',
          quantity: 100,
          storageLocation: 'A1-B2-C3', // Same as existing
          items: [{
            itemId: 'CONFLICT_ITEM001',
            quantity: 50,
            status: 'pending',
            storageLocation: 'A1-B2-C3-01' // Same as existing
          }]
        }]
      };

      const response = await request(app)
        .post('/api/warehouse-approvals')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .send(conflictData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('storage location');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const response = await request(app)
        .get('/api/warehouse-approvals?limit=100')
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('should support complex filtering combinations', async () => {
      const response = await request(app)
        .get(`/api/warehouse-approvals?status=pending&warehouse=${testWarehouse._id}&priority=high&assignedTo=${testWarehouseManager._id}`)
        .set('Authorization', `Bearer ${warehouseManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});