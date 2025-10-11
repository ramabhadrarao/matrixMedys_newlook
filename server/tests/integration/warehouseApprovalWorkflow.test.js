// tests/integration/warehouseApprovalWorkflow.test.js
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
  createTestQCRecord,
  generateJWTToken,
  cleanupTestData
} from '../helpers/testHelpers.js';

import WarehouseApproval from '../../models/WarehouseApproval.js';
import QualityControl from '../../models/QualityControl.js';
import Inventory from '../../models/Inventory.js';
import Notification from '../../models/Notification.js';
import AuditLog from '../../models/AuditLog.js';

describe('Warehouse Approval Workflow Integration Tests', () => {
  let testUser, testAdmin, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQCRecord;
  let userToken, adminToken;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser(['warehouse_approval:view', 'warehouse_approval:create', 'warehouse_approval:update']);
    testAdmin = await createTestAdmin();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    testQCRecord = await createTestQCRecord(testInvoiceReceiving, testUser);
    
    // Approve QC record to enable warehouse approval
    await QualityControl.findByIdAndUpdate(testQCRecord._id, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: testAdmin._id
    });
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdmin);
  });

  describe('Complete Warehouse Approval Workflow', () => {
    it('should complete the entire warehouse approval workflow successfully', async () => {
      // Step 1: Create Warehouse Approval Record
      const createApprovalResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      expect(createApprovalResponse.status).toBe(201);
      expect(createApprovalResponse.body.success).toBe(true);
      
      const approvalRecordId = createApprovalResponse.body.data._id;

      // Verify warehouse approval record was created
      const approvalRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(approvalRecord).toBeTruthy();
      expect(approvalRecord.status).toBe('pending');
      expect(approvalRecord.assignedTo.toString()).toBe(testUser._id.toString());

      // Verify notification was created
      const notification = await Notification.findOne({
        'reference.type': 'warehouse_approval',
        'reference.id': approvalRecordId
      });
      expect(notification).toBeTruthy();
      expect(notification.type).toBe('warehouse_assignment');

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        'entity.type': 'warehouse_approval',
        'entity.id': approvalRecordId,
        action: 'warehouse_approval_create'
      });
      expect(auditLog).toBeTruthy();

      // Step 2: Update Warehouse Approval with inspection results
      const updateApprovalResponse = await request(app)
        .put(`/api/warehouse-approval/${approvalRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: approvalRecord.products[0].productId,
            approvalResult: 'approved',
            itemDetails: [{
              itemId: approvalRecord.products[0].itemDetails[0].itemId,
              status: 'approved',
              reason: 'Storage conditions verified - ready for inventory',
              inspectionNotes: 'Physical verification completed, storage location confirmed'
            }]
          }]
        });

      expect(updateApprovalResponse.status).toBe(200);
      expect(updateApprovalResponse.body.success).toBe(true);

      // Verify warehouse approval record was updated
      const updatedApprovalRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(updatedApprovalRecord.products[0].approvalResult).toBe('approved');
      expect(updatedApprovalRecord.products[0].itemDetails[0].status).toBe('approved');

      // Step 3: Submit Warehouse Approval for final approval
      const submitApprovalResponse = await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'All items verified and ready for inventory integration.'
        });

      expect(submitApprovalResponse.status).toBe(200);
      expect(submitApprovalResponse.body.success).toBe(true);

      // Verify warehouse approval status changed to submitted
      const submittedApprovalRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(submittedApprovalRecord.status).toBe('submitted');
      expect(submittedApprovalRecord.submittedAt).toBeTruthy();
      expect(submittedApprovalRecord.submittedBy.toString()).toBe(testUser._id.toString());

      // Step 4: Approve Warehouse Approval (as admin)
      const approveWarehouseResponse = await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalRemarks: 'Warehouse approval completed - items ready for inventory'
        });

      expect(approveWarehouseResponse.status).toBe(200);
      expect(approveWarehouseResponse.body.success).toBe(true);

      // Verify warehouse approval record was approved
      const approvedWarehouseRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(approvedWarehouseRecord.status).toBe('approved');
      expect(approvedWarehouseRecord.approvedAt).toBeTruthy();
      expect(approvedWarehouseRecord.approvedBy.toString()).toBe(testAdmin._id.toString());
      expect(approvedWarehouseRecord.approvalRemarks).toBe('Warehouse approval completed - items ready for inventory');

      // Step 5: Verify inventory integration
      // Check if inventory records were created
      const inventoryRecords = await Inventory.find({
        product: testProduct._id,
        warehouse: testWarehouse._id
      });
      expect(inventoryRecords.length).toBeGreaterThan(0);

      // Verify inventory record details
      const inventoryRecord = inventoryRecords[0];
      expect(inventoryRecord.currentStock).toBeGreaterThan(0);
      expect(inventoryRecord.batchNumber).toBe(approvedWarehouseRecord.products[0].batchNumber);
      expect(inventoryRecord.expiryDate).toBeTruthy();

      // Verify approval notification was created
      const approvalNotification = await Notification.findOne({
        'reference.type': 'warehouse_approval',
        'reference.id': approvalRecordId,
        type: 'warehouse_approved'
      });
      expect(approvalNotification).toBeTruthy();

      // Verify approval audit log was created
      const approvalAuditLog = await AuditLog.findOne({
        'entity.type': 'warehouse_approval',
        'entity.id': approvalRecordId,
        action: 'warehouse_approve'
      });
      expect(approvalAuditLog).toBeTruthy();
    });

    it('should handle warehouse approval rejection workflow', async () => {
      // Create warehouse approval record
      const createApprovalResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      const approvalRecordId = createApprovalResponse.body.data._id;

      // Update with failed results
      await request(app)
        .put(`/api/warehouse-approval/${approvalRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: createApprovalResponse.body.data.products[0].productId,
            approvalResult: 'rejected',
            itemDetails: [{
              itemId: createApprovalResponse.body.data.products[0].itemDetails[0].itemId,
              status: 'rejected',
              reason: 'Storage conditions not suitable',
              inspectionNotes: 'Temperature control issues detected in storage area'
            }]
          }]
        });

      // Submit for approval
      await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'Items rejected due to storage condition issues.'
        });

      // Reject warehouse approval (as admin)
      const rejectApprovalResponse = await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Storage conditions not meeting requirements'
        });

      expect(rejectApprovalResponse.status).toBe(200);
      expect(rejectApprovalResponse.body.success).toBe(true);

      // Verify warehouse approval record was rejected
      const rejectedApprovalRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(rejectedApprovalRecord.status).toBe('rejected');
      expect(rejectedApprovalRecord.rejectedAt).toBeTruthy();
      expect(rejectedApprovalRecord.rejectedBy.toString()).toBe(testAdmin._id.toString());
      expect(rejectedApprovalRecord.rejectionReason).toBe('Storage conditions not meeting requirements');

      // Verify no inventory records were created
      const inventoryRecords = await Inventory.find({
        product: testProduct._id,
        warehouse: testWarehouse._id
      });
      expect(inventoryRecords.length).toBe(0);

      // Verify rejection notification was created
      const rejectionNotification = await Notification.findOne({
        'reference.type': 'warehouse_approval',
        'reference.id': approvalRecordId,
        type: 'warehouse_rejected'
      });
      expect(rejectionNotification).toBeTruthy();
    });

    it('should handle warehouse approval reassignment workflow', async () => {
      // Create warehouse approval record
      const createApprovalResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      const approvalRecordId = createApprovalResponse.body.data._id;

      // Create another user for reassignment
      const newUser = await createTestUser(['warehouse_approval:view', 'warehouse_approval:update']);

      // Reassign warehouse approval record
      const reassignResponse = await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedTo: newUser._id.toString()
        });

      expect(reassignResponse.status).toBe(200);
      expect(reassignResponse.body.success).toBe(true);

      // Verify warehouse approval record was reassigned
      const reassignedApprovalRecord = await WarehouseApproval.findById(approvalRecordId);
      expect(reassignedApprovalRecord.assignedTo.toString()).toBe(newUser._id.toString());

      // Verify reassignment notification was created
      const reassignmentNotification = await Notification.findOne({
        'reference.type': 'warehouse_approval',
        'reference.id': approvalRecordId,
        type: 'warehouse_assignment',
        'recipients.userId': newUser._id
      });
      expect(reassignmentNotification).toBeTruthy();

      // Verify reassignment audit log was created
      const reassignmentAuditLog = await AuditLog.findOne({
        'entity.type': 'warehouse_approval',
        'entity.id': approvalRecordId,
        action: 'warehouse_assign'
      });
      expect(reassignmentAuditLog).toBeTruthy();
    });

    it('should handle bulk warehouse approval assignment', async () => {
      // Create multiple warehouse approval records
      const approvalRecords = [];
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/warehouse-approval')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            qcRecord: testQCRecord._id.toString(),
            warehouse: testWarehouse._id.toString(),
            assignedTo: testUser._id.toString(),
            products: testQCRecord.products.map(product => ({
              productId: product.productId,
              qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
              unit: product.unit,
              batchNumber: product.batchNumber,
              expiryDate: product.expiryDate,
              storageLocation: `A-01-00${i + 1}`
            }))
          });
        approvalRecords.push(createResponse.body.data._id);
      }

      // Create new user for bulk assignment
      const newUser = await createTestUser(['warehouse_approval:view', 'warehouse_approval:update']);

      // Bulk assign warehouse approval records
      const bulkAssignResponse = await request(app)
        .post('/api/warehouse-approval/bulk-assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalIds: approvalRecords,
          assignedTo: newUser._id.toString()
        });

      expect(bulkAssignResponse.status).toBe(200);
      expect(bulkAssignResponse.body.success).toBe(true);

      // Verify all warehouse approval records were reassigned
      for (const approvalId of approvalRecords) {
        const approvalRecord = await WarehouseApproval.findById(approvalId);
        expect(approvalRecord.assignedTo.toString()).toBe(newUser._id.toString());
      }

      // Verify bulk assignment notifications were created
      const notifications = await Notification.find({
        'reference.type': 'warehouse_approval',
        'reference.id': { $in: approvalRecords },
        type: 'warehouse_assignment',
        'recipients.userId': newUser._id
      });
      expect(notifications.length).toBe(approvalRecords.length);
    });
  });

  describe('Warehouse Approval Dashboard and Statistics', () => {
    beforeEach(async () => {
      // Create multiple warehouse approval records with different statuses
      const statuses = ['pending', 'in_progress', 'submitted', 'approved', 'rejected'];
      
      for (const status of statuses) {
        const createResponse = await request(app)
          .post('/api/warehouse-approval')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            qcRecord: testQCRecord._id.toString(),
            warehouse: testWarehouse._id.toString(),
            assignedTo: testUser._id.toString(),
            products: testQCRecord.products.map(product => ({
              productId: product.productId,
              qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
              unit: product.unit,
              batchNumber: product.batchNumber,
              expiryDate: product.expiryDate,
              storageLocation: 'A-01-001'
            }))
          });

        // Update status directly for testing
        await WarehouseApproval.findByIdAndUpdate(createResponse.body.data._id, { status });
      }
    });

    it('should return warehouse approval dashboard statistics', async () => {
      const dashboardResponse = await request(app)
        .get('/api/warehouse-approval/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('totalRecords');
      expect(dashboardResponse.body.data).toHaveProperty('statusBreakdown');
      expect(dashboardResponse.body.data).toHaveProperty('resultBreakdown');
      expect(dashboardResponse.body.data).toHaveProperty('recentActivity');
    });

    it('should return warehouse approval workload statistics', async () => {
      const workloadResponse = await request(app)
        .get('/api/warehouse-approval/workload')
        .set('Authorization', `Bearer ${userToken}`);

      expect(workloadResponse.status).toBe(200);
      expect(workloadResponse.body.success).toBe(true);
      expect(workloadResponse.body.data).toHaveProperty('userWorkload');
      expect(workloadResponse.body.data).toHaveProperty('warehouseStats');
    });

    it('should return warehouse approval statistics', async () => {
      const statisticsResponse = await request(app)
        .get('/api/warehouse-approval/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(statisticsResponse.status).toBe(200);
      expect(statisticsResponse.body.success).toBe(true);
      expect(statisticsResponse.body.data).toHaveProperty('statusStats');
      expect(statisticsResponse.body.data).toHaveProperty('resultStats');
      expect(statisticsResponse.body.data).toHaveProperty('warehouseStats');
    });
  });

  describe('Inventory Integration Tests', () => {
    it('should create inventory records after warehouse approval', async () => {
      // Create and approve warehouse approval
      const createApprovalResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      const approvalRecordId = createApprovalResponse.body.data._id;

      // Complete the approval workflow
      await request(app)
        .put(`/api/warehouse-approval/${approvalRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: createApprovalResponse.body.data.products[0].productId,
            approvalResult: 'approved',
            itemDetails: [{
              itemId: createApprovalResponse.body.data.products[0].itemDetails[0].itemId,
              status: 'approved',
              reason: 'Ready for inventory',
              inspectionNotes: 'All checks passed'
            }]
          }]
        });

      await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'Ready for inventory integration.'
        });

      await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalRemarks: 'Approved for inventory'
        });

      // Verify inventory records were created
      const inventoryRecords = await Inventory.find({
        product: testProduct._id,
        warehouse: testWarehouse._id
      });

      expect(inventoryRecords.length).toBeGreaterThan(0);
      
      const inventoryRecord = inventoryRecords[0];
      expect(inventoryRecord.currentStock).toBeGreaterThan(0);
      expect(inventoryRecord.status).toBe('available');
      expect(inventoryRecord.batchNumber).toBeTruthy();
      expect(inventoryRecord.expiryDate).toBeTruthy();
    });

    it('should update existing inventory records when adding to same batch', async () => {
      // Create initial inventory record
      const initialInventory = new Inventory({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        currentStock: 50,
        reservedStock: 0,
        availableStock: 50,
        batchNumber: 'BATCH001',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'available',
        storageLocation: 'A-01-001'
      });
      await initialInventory.save();

      // Create warehouse approval with same batch
      const createApprovalResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: 25,
            unit: product.unit,
            batchNumber: 'BATCH001', // Same batch
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            storageLocation: 'A-01-001'
          }))
        });

      const approvalRecordId = createApprovalResponse.body.data._id;

      // Complete approval workflow
      await request(app)
        .put(`/api/warehouse-approval/${approvalRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          products: [{
            productId: createApprovalResponse.body.data.products[0].productId,
            approvalResult: 'approved',
            itemDetails: [{
              itemId: createApprovalResponse.body.data.products[0].itemDetails[0].itemId,
              status: 'approved',
              reason: 'Ready for inventory',
              inspectionNotes: 'All checks passed'
            }]
          }]
        });

      await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          generalRemarks: 'Ready for inventory integration.'
        });

      await request(app)
        .post(`/api/warehouse-approval/${approvalRecordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalRemarks: 'Approved for inventory'
        });

      // Verify inventory was updated, not duplicated
      const inventoryRecords = await Inventory.find({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        batchNumber: 'BATCH001'
      });

      expect(inventoryRecords.length).toBe(1);
      expect(inventoryRecords[0].currentStock).toBe(75); // 50 + 25
      expect(inventoryRecords[0].availableStock).toBe(75);
    });
  });

  describe('Warehouse Approval Workflow Error Handling', () => {
    it('should handle invalid warehouse approval ID', async () => {
      const response = await request(app)
        .get('/api/warehouse-approval/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/warehouse-approval')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle insufficient permissions', async () => {
      const limitedUser = await createTestUser(['some_other:permission']);
      const limitedToken = generateJWTToken(limitedUser);

      const response = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString()
        });

      expect(response.status).toBe(403);
    });

    it('should handle creating warehouse approval for unapproved QC record', async () => {
      // Create QC record that is not approved
      const unapprovedQC = await createTestQCRecord(testInvoiceReceiving, testUser);

      const response = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: unapprovedQC._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: unapprovedQC.products.map(product => ({
            productId: product.productId,
            qcPassedQty: 1,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate warehouse approval creation', async () => {
      // Create first warehouse approval record
      await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      // Try to create duplicate warehouse approval record
      const duplicateResponse = await request(app)
        .post('/api/warehouse-approval')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          qcRecord: testQCRecord._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: testQCRecord.products.map(product => ({
            productId: product.productId,
            qcPassedQty: product.itemDetails.filter(item => item.status === 'passed').length,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate,
            storageLocation: 'A-01-001'
          }))
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.success).toBe(false);
    });
  });
});