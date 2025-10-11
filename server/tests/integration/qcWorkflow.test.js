// tests/integration/qcWorkflow.test.js
import request from 'supertest';
import app from '../../app.js';
import {
  createTestUser,
  createTestAdmin,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  generateJWTToken,
  cleanupTestData
} from '../helpers/testHelpers.js';

import QualityControl from '../../models/QualityControl.js';
import InvoiceReceiving from '../../models/InvoiceReceiving.js';
import Notification from '../../models/Notification.js';
import AuditLog from '../../models/AuditLog.js';

describe('QC Workflow Integration Tests', () => {
  let testUser, testAdmin, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving;
  let userToken, adminToken;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser(['quality_control:view', 'quality_control:create', 'quality_control:update']);
    testAdmin = await createTestAdmin();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdmin);
  });

  describe('Complete QC Workflow', () => {
    it('should complete the entire QC workflow successfully', async () => {
      // Step 1: Create QC Record
      const createQCResponse = await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: testInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        });

      expect(createQCResponse.status).toBe(201);
      expect(createQCResponse.body.success).toBe(true);
      
      const qcRecordId = createQCResponse.body.data._id;

      // Verify QC record was created
      const qcRecord = await QualityControl.findById(qcRecordId);
      expect(qcRecord).toBeTruthy();
      expect(qcRecord.status).toBe('pending');
      expect(qcRecord.assignedTo.toString()).toBe(testUser._id.toString());

      // Verify notification was created
      const notification = await Notification.findOne({
        'reference.type': 'qc_record',
        'reference.id': qcRecordId
      });
      expect(notification).toBeTruthy();
      expect(notification.type).toBe('qc_assignment');

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        'entity.type': 'qc_record',
        'entity.id': qcRecordId,
        action: 'qc_create'
      });
      expect(auditLog).toBeTruthy();

      // Step 2: Update QC Record with inspection results
      const updateQCResponse = await request(app)
        .put(`/api/quality-control/${qcRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: qcRecord.products[0].productId,
            qcResult: 'passed',
            itemDetails: [{
              itemId: qcRecord.products[0].itemDetails[0].itemId,
              status: 'passed',
              reason: 'Quality check passed - all parameters within limits',
              inspectionNotes: 'Visual inspection: Good condition, no damage observed'
            }]
          }]
        });

      expect(updateQCResponse.status).toBe(200);
      expect(updateQCResponse.body.success).toBe(true);

      // Verify QC record was updated
      const updatedQCRecord = await QualityControl.findById(qcRecordId);
      expect(updatedQCRecord.products[0].qcResult).toBe('passed');
      expect(updatedQCRecord.products[0].itemDetails[0].status).toBe('passed');

      // Step 3: Submit QC Record for approval
      const submitQCResponse = await request(app)
        .post(`/api/quality-control/${qcRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'All items passed quality inspection. Ready for approval.'
        });

      expect(submitQCResponse.status).toBe(200);
      expect(submitQCResponse.body.success).toBe(true);

      // Verify QC record status changed to submitted
      const submittedQCRecord = await QualityControl.findById(qcRecordId);
      expect(submittedQCRecord.status).toBe('submitted');
      expect(submittedQCRecord.submittedAt).toBeTruthy();
      expect(submittedQCRecord.submittedBy.toString()).toBe(testUser._id.toString());

      // Step 4: Approve QC Record (as admin)
      const approveQCResponse = await request(app)
        .post(`/api/quality-control/${qcRecordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalRemarks: 'QC approved - all quality checks passed successfully'
        });

      expect(approveQCResponse.status).toBe(200);
      expect(approveQCResponse.body.success).toBe(true);

      // Verify QC record was approved
      const approvedQCRecord = await QualityControl.findById(qcRecordId);
      expect(approvedQCRecord.status).toBe('approved');
      expect(approvedQCRecord.approvedAt).toBeTruthy();
      expect(approvedQCRecord.approvedBy.toString()).toBe(testAdmin._id.toString());
      expect(approvedQCRecord.approvalRemarks).toBe('QC approved - all quality checks passed successfully');

      // Verify invoice receiving status was updated
      const updatedInvoiceReceiving = await InvoiceReceiving.findById(testInvoiceReceiving._id);
      expect(updatedInvoiceReceiving.qcStatus).toBe('completed');

      // Verify approval notification was created
      const approvalNotification = await Notification.findOne({
        'reference.type': 'qc_record',
        'reference.id': qcRecordId,
        type: 'qc_approved'
      });
      expect(approvalNotification).toBeTruthy();

      // Verify approval audit log was created
      const approvalAuditLog = await AuditLog.findOne({
        'entity.type': 'qc_record',
        'entity.id': qcRecordId,
        action: 'qc_approve'
      });
      expect(approvalAuditLog).toBeTruthy();
    });

    it('should handle QC rejection workflow', async () => {
      // Create and submit QC record
      const createQCResponse = await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: testInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        });

      const qcRecordId = createQCResponse.body.data._id;

      // Update with failed results
      await request(app)
        .put(`/api/quality-control/${qcRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: createQCResponse.body.data.products[0].productId,
            qcResult: 'failed',
            itemDetails: [{
              itemId: createQCResponse.body.data.products[0].itemDetails[0].itemId,
              status: 'failed',
              reason: 'Product damaged during transport',
              inspectionNotes: 'Visible damage to packaging and contents'
            }]
          }]
        });

      // Submit for approval
      await request(app)
        .post(`/api/quality-control/${qcRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'Items failed quality inspection due to damage.'
        });

      // Reject QC Record (as admin)
      const rejectQCResponse = await request(app)
        .post(`/api/quality-control/${qcRecordId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Quality standards not met - items damaged'
        });

      expect(rejectQCResponse.status).toBe(200);
      expect(rejectQCResponse.body.success).toBe(true);

      // Verify QC record was rejected
      const rejectedQCRecord = await QualityControl.findById(qcRecordId);
      expect(rejectedQCRecord.status).toBe('rejected');
      expect(rejectedQCRecord.rejectedAt).toBeTruthy();
      expect(rejectedQCRecord.rejectedBy.toString()).toBe(testAdmin._id.toString());
      expect(rejectedQCRecord.rejectionReason).toBe('Quality standards not met - items damaged');

      // Verify invoice receiving status was updated
      const updatedInvoiceReceiving = await InvoiceReceiving.findById(testInvoiceReceiving._id);
      expect(updatedInvoiceReceiving.qcStatus).toBe('rejected');

      // Verify rejection notification was created
      const rejectionNotification = await Notification.findOne({
        'reference.type': 'qc_record',
        'reference.id': qcRecordId,
        type: 'qc_rejected'
      });
      expect(rejectionNotification).toBeTruthy();
    });

    it('should handle QC reassignment workflow', async () => {
      // Create QC record
      const createQCResponse = await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: testInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        });

      const qcRecordId = createQCResponse.body.data._id;

      // Create another user for reassignment
      const newUser = await createTestUser(['quality_control:view', 'quality_control:update']);

      // Reassign QC record
      const reassignResponse = await request(app)
        .post(`/api/quality-control/${qcRecordId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedTo: newUser._id.toString()
        });

      expect(reassignResponse.status).toBe(200);
      expect(reassignResponse.body.success).toBe(true);

      // Verify QC record was reassigned
      const reassignedQCRecord = await QualityControl.findById(qcRecordId);
      expect(reassignedQCRecord.assignedTo.toString()).toBe(newUser._id.toString());

      // Verify reassignment notification was created
      const reassignmentNotification = await Notification.findOne({
        'reference.type': 'qc_record',
        'reference.id': qcRecordId,
        type: 'qc_assignment',
        'recipients.userId': newUser._id
      });
      expect(reassignmentNotification).toBeTruthy();

      // Verify reassignment audit log was created
      const reassignmentAuditLog = await AuditLog.findOne({
        'entity.type': 'qc_record',
        'entity.id': qcRecordId,
        action: 'qc_assign'
      });
      expect(reassignmentAuditLog).toBeTruthy();
    });

    it('should handle bulk QC assignment', async () => {
      // Create multiple QC records
      const qcRecords = [];
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/quality-control')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            invoiceReceiving: testInvoiceReceiving._id.toString(),
            qcType: 'incoming_inspection',
            assignedTo: testUser._id.toString(),
            products: testInvoiceReceiving.products.map(product => ({
              productId: product.product,
              receivedQty: product.receivedQty,
              unit: product.unit,
              batchNumber: product.batchNumber,
              expiryDate: product.expiryDate
            }))
          });
        qcRecords.push(createResponse.body.data._id);
      }

      // Create new user for bulk assignment
      const newUser = await createTestUser(['quality_control:view', 'quality_control:update']);

      // Bulk assign QC records
      const bulkAssignResponse = await request(app)
        .post('/api/quality-control/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qcIds: qcRecords,
          assignedTo: newUser._id.toString()
        });

      expect(bulkAssignResponse.status).toBe(200);
      expect(bulkAssignResponse.body.success).toBe(true);

      // Verify all QC records were reassigned
      for (const qcId of qcRecords) {
        const qcRecord = await QualityControl.findById(qcId);
        expect(qcRecord.assignedTo.toString()).toBe(newUser._id.toString());
      }

      // Verify bulk assignment notifications were created
      const notifications = await Notification.find({
        'reference.type': 'qc_record',
        'reference.id': { $in: qcRecords },
        type: 'qc_assignment',
        'recipients.userId': newUser._id
      });
      expect(notifications.length).toBe(qcRecords.length);
    });
  });

  describe('QC Dashboard and Statistics', () => {
    beforeEach(async () => {
      // Create multiple QC records with different statuses
      const statuses = ['pending', 'in_progress', 'submitted', 'approved', 'rejected'];
      
      for (const status of statuses) {
        const createResponse = await request(app)
          .post('/api/quality-control')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            invoiceReceiving: testInvoiceReceiving._id.toString(),
            qcType: 'incoming_inspection',
            assignedTo: testUser._id.toString(),
            products: testInvoiceReceiving.products.map(product => ({
              productId: product.product,
              receivedQty: product.receivedQty,
              unit: product.unit,
              batchNumber: product.batchNumber,
              expiryDate: product.expiryDate
            }))
          });

        // Update status directly for testing
        await QualityControl.findByIdAndUpdate(createResponse.body.data._id, { status });
      }
    });

    it('should return QC dashboard statistics', async () => {
      const dashboardResponse = await request(app)
        .get('/api/quality-control/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('totalRecords');
      expect(dashboardResponse.body.data).toHaveProperty('statusBreakdown');
      expect(dashboardResponse.body.data).toHaveProperty('resultBreakdown');
      expect(dashboardResponse.body.data).toHaveProperty('recentActivity');
    });

    it('should return QC workload statistics', async () => {
      const workloadResponse = await request(app)
        .get('/api/quality-control/workload')
        .set('Authorization', `Bearer ${userToken}`);

      expect(workloadResponse.status).toBe(200);
      expect(workloadResponse.body.success).toBe(true);
      expect(workloadResponse.body.data).toHaveProperty('userWorkload');
      expect(workloadResponse.body.data).toHaveProperty('departmentStats');
    });

    it('should return QC statistics', async () => {
      const statisticsResponse = await request(app)
        .get('/api/quality-control/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(statisticsResponse.status).toBe(200);
      expect(statisticsResponse.body.success).toBe(true);
      expect(statisticsResponse.body.data).toHaveProperty('statusStats');
      expect(statisticsResponse.body.data).toHaveProperty('resultStats');
      expect(statisticsResponse.body.data).toHaveProperty('typeStats');
    });
  });

  describe('QC Workflow Error Handling', () => {
    it('should handle invalid QC record ID', async () => {
      const response = await request(app)
        .get('/api/quality-control/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/quality-control')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle insufficient permissions', async () => {
      const limitedUser = await createTestUser(['some_other:permission']);
      const limitedToken = generateJWTToken(limitedUser);

      const response = await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection'
        });

      expect(response.status).toBe(403);
    });

    it('should handle duplicate QC record creation', async () => {
      // Create first QC record
      await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: testInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        });

      // Try to create duplicate QC record
      const duplicateResponse = await request(app)
        .post('/api/quality-control')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceReceiving: testInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: testInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.success).toBe(false);
    });
  });
});