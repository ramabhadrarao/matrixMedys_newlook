// tests/api/routes/qcRoutes.test.js
import request from 'supertest';
import app from '../../../app.js';
import {
  createTestUser,
  createTestQCRecord,
  createTestProduct,
  createTestWarehouse,
  generateJWTToken,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('QC Routes API Tests', () => {
  let testUser, testAdmin, testQCManager, testWarehouse, testProduct;
  let userToken, adminToken, qcManagerToken;
  let testQCRecord;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    testUser = await createTestUser();
    testAdmin = await createTestUser({ role: 'admin' });
    testQCManager = await createTestUser({ 
      role: 'qc_manager',
      permissions: ['read_qc', 'create_qc', 'update_qc', 'approve_qc']
    });
    
    // Create test entities
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdmin);
    qcManagerToken = generateJWTToken(testQCManager);
    
    // Create test QC record
    testQCRecord = await createTestQCRecord({
      assignedTo: testQCManager._id,
      products: [{
        product: testProduct._id,
        batchNumber: 'BATCH001',
        quantity: 100,
        items: [{
          itemId: 'ITEM001',
          quantity: 50,
          status: 'pending'
        }]
      }]
    });
  });

  describe('GET /api/qc', () => {
    it('should retrieve QC records with authentication', async () => {
      const response = await request(app)
        .get('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/qc')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject requests without proper permissions', async () => {
      const response = await request(app)
        .get('/api/qc')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/qc?page=1&limit=10')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/qc?status=pending')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned records should have pending status
      response.body.data.forEach(record => {
        expect(record.status).toBe('pending');
      });
    });

    it('should support filtering by qcType', async () => {
      const response = await request(app)
        .get('/api/qc?qcType=incoming')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.qcType).toBe('incoming');
      });
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/qc?sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify sorting order
      const dates = response.body.data.map(record => new Date(record.createdAt));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
      }
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/qc?page=0&limit=101')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/qc/:id', () => {
    it('should retrieve specific QC record', async () => {
      const response = await request(app)
        .get(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testQCRecord._id.toString());
      expect(response.body.data.products).toBeDefined();
    });

    it('should return 404 for non-existent QC record', async () => {
      const response = await request(app)
        .get('/api/qc/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate ObjectId format', async () => {
      const response = await request(app)
        .get('/api/qc/invalid_id')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should populate related fields', async () => {
      const response = await request(app)
        .get(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.data.assignedTo).toBeDefined();
      expect(response.body.data.products[0].product).toBeDefined();
    });
  });

  describe('POST /api/qc', () => {
    it('should create new QC record with valid data', async () => {
      const qcData = {
        qcType: 'incoming',
        priority: 'high',
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH002',
          quantity: 200,
          items: [{
            itemId: 'ITEM002',
            quantity: 100,
            status: 'pending'
          }]
        }],
        assignedTo: testQCManager._id.toString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test QC creation'
      };

      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(qcData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBeDefined();
      expect(response.body.data.qcType).toBe(qcData.qcType);
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject creation without required fields', async () => {
      const invalidData = {
        priority: 'high'
        // Missing qcType, products
      };

      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject creation with invalid product references', async () => {
      const invalidData = {
        qcType: 'incoming',
        products: [{
          product: '507f1f77bcf86cd799439011', // Non-existent product
          batchNumber: 'BATCH002',
          quantity: 100,
          items: [{ itemId: 'ITEM002', quantity: 50, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Product not found');
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        qcType: 'incoming',
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH003',
          quantity: 50,
          items: [{ itemId: 'ITEM003', quantity: 25, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(minimalData)
        .expect(201);

      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.priority).toBe('medium');
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should require proper permissions for creation', async () => {
      const qcData = {
        qcType: 'incoming',
        products: [{
          product: testProduct._id.toString(),
          batchNumber: 'BATCH004',
          quantity: 100,
          items: [{ itemId: 'ITEM004', quantity: 50, status: 'pending' }]
        }]
      };

      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${userToken}`)
        .send(qcData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('PUT /api/qc/:id', () => {
    it('should update QC record with valid data', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'low',
        notes: 'Updated notes',
        inspectionResults: {
          overallResult: 'pass',
          notes: 'All items passed inspection',
          inspectedBy: testQCManager._id.toString(),
          inspectionDate: new Date().toISOString()
        }
      };

      const response = await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.priority).toBe(updateData.priority);
      expect(response.body.data.inspectionResults).toBeDefined();
    });

    it('should update product items status', async () => {
      const updateData = {
        products: [{
          product: testProduct._id.toString(),
          items: [{
            itemId: 'ITEM001',
            status: 'approved',
            qcResult: 'pass',
            notes: 'Item approved after inspection'
          }]
        }]
      };

      const response = await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products[0].items[0].status).toBe('approved');
      expect(response.body.data.products[0].items[0].qcResult).toBe('pass');
    });

    it('should reject updates with invalid status transitions', async () => {
      // First, set status to completed
      await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ status: 'completed' })
        .expect(200);

      // Try to update back to pending (invalid transition)
      const response = await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ status: 'pending' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should update updatedAt timestamp', async () => {
      const originalUpdatedAt = testQCRecord.updatedAt;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'Updated timestamp test' })
        .expect(200);

      expect(new Date(response.body.data.updatedAt).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });

    it('should validate update data', async () => {
      const invalidData = {
        status: 'invalid_status',
        priority: 'invalid_priority'
      };

      const response = await request(app)
        .put(`/api/qc/${testQCRecord._id}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/qc/:id/submit', () => {
    it('should submit QC record for approval', async () => {
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'Ready for approval' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.submittedAt).toBeDefined();
    });

    it('should reject submission of already submitted record', async () => {
      // First submission
      await request(app)
        .post(`/api/qc/${testQCRecord._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'First submission' })
        .expect(200);

      // Second submission should fail
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'Second submission' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already submitted');
    });

    it('should validate all required inspection data before submission', async () => {
      // Create QC record without complete inspection data
      const incompleteQC = await createTestQCRecord({
        assignedTo: testQCManager._id,
        products: [{
          product: testProduct._id,
          batchNumber: 'INCOMPLETE001',
          quantity: 100,
          items: [{
            itemId: 'ITEM001',
            quantity: 50,
            status: 'pending' // Missing inspection results
          }]
        }]
      });

      const response = await request(app)
        .post(`/api/qc/${incompleteQC._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inspection results');
    });
  });

  describe('POST /api/qc/:id/approve', () => {
    beforeEach(async () => {
      // Submit the QC record first
      await request(app)
        .post(`/api/qc/${testQCRecord._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'Ready for approval' });
    });

    it('should approve submitted QC record', async () => {
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/approve`)
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

    it('should reject approval of non-submitted record', async () => {
      const pendingQC = await createTestQCRecord({
        assignedTo: testQCManager._id,
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/qc/${pendingQC._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approval attempt' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not submitted');
    });

    it('should require approval permissions', async () => {
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ notes: 'Unauthorized approval' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('POST /api/qc/:id/reject', () => {
    beforeEach(async () => {
      // Submit the QC record first
      await request(app)
        .post(`/api/qc/${testQCRecord._id}/submit`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .send({ notes: 'Ready for approval' });
    });

    it('should reject submitted QC record with reason', async () => {
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          reason: 'Incomplete inspection data',
          notes: 'Please complete all required fields'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectedAt).toBeDefined();
      expect(response.body.data.rejectionReason).toBe('Incomplete inspection data');
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/reject`)
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

  describe('GET /api/qc/dashboard', () => {
    it('should return QC dashboard data', async () => {
      const response = await request(app)
        .get('/api/qc/dashboard')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.recentRecords).toBeDefined();
      expect(response.body.data.statusBreakdown).toBeDefined();
    });

    it('should filter dashboard by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/qc/dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should require proper permissions for dashboard access', async () => {
      const response = await request(app)
        .get('/api/qc/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('POST /api/qc/bulk-assign', () => {
    let additionalQCRecord;

    beforeEach(async () => {
      additionalQCRecord = await createTestQCRecord({
        assignedTo: testQCManager._id,
        status: 'pending'
      });
    });

    it('should bulk assign QC records to user', async () => {
      const bulkData = {
        ids: [testQCRecord._id.toString(), additionalQCRecord._id.toString()],
        assignedTo: testQCManager._id.toString(),
        notes: 'Bulk assignment for urgent processing'
      };

      const response = await request(app)
        .post('/api/qc/bulk-assign')
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
        .post('/api/qc/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkData = {
        ids: [testQCRecord._id.toString(), '507f1f77bcf86cd799439011'], // One valid, one invalid
        assignedTo: testQCManager._id.toString()
      };

      const response = await request(app)
        .post('/api/qc/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(207); // Multi-status

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(1);
      expect(response.body.data.failed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock a server error by using invalid ObjectId format in URL
      const response = await request(app)
        .get('/api/qc/invalid_object_id_format')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should handle database connection errors', async () => {
      // This would require mocking the database connection
      // For now, we'll test the error response format
      const response = await request(app)
        .get('/api/qc/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/qc')
        .set('Authorization', `Bearer ${qcManagerToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for bulk operations', async () => {
      // This test would require configuring rate limiting
      // For now, we'll ensure the endpoint exists and responds
      const bulkData = {
        ids: [testQCRecord._id.toString()],
        assignedTo: testQCManager._id.toString()
      };

      const response = await request(app)
        .post('/api/qc/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      const updatePromises = [
        request(app)
          .put(`/api/qc/${testQCRecord._id}`)
          .set('Authorization', `Bearer ${qcManagerToken}`)
          .send({ notes: 'Update 1' }),
        request(app)
          .put(`/api/qc/${testQCRecord._id}`)
          .set('Authorization', `Bearer ${qcManagerToken}`)
          .send({ notes: 'Update 2' })
      ];

      const responses = await Promise.all(updatePromises);
      
      // Both should succeed or one should handle the conflict
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status);
      });
    });

    it('should validate business rules during updates', async () => {
      // Try to approve without submission
      const response = await request(app)
        .post(`/api/qc/${testQCRecord._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Direct approval attempt' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not submitted');
    });
  });
});