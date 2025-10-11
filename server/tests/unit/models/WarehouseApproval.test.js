// tests/unit/models/WarehouseApproval.test.js
import mongoose from 'mongoose';
import WarehouseApproval from '../../../models/WarehouseApproval.js';
import {
  createTestUser,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  createTestQCRecord,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('WarehouseApproval Model Tests', () => {
  let testUser, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQCRecord;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    testQCRecord = await createTestQCRecord(testInvoiceReceiving, testUser);
  });

  describe('Schema Validation', () => {
    it('should create a valid warehouse approval record with required fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord._id).toBeDefined();
      expect(savedRecord.qcRecord.toString()).toBe(testQCRecord._id.toString());
      expect(savedRecord.warehouse.toString()).toBe(testWarehouse._id.toString());
      expect(savedRecord.status).toBe('pending');
      expect(savedRecord.createdAt).toBeDefined();
      expect(savedRecord.updatedAt).toBeDefined();
    });

    it('should require qcRecord field', async () => {
      const approvalData = {
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should require warehouse field', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'invalid_status'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should validate product item status enum values', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'invalid_status',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should validate approvalResult enum values', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          approvalResult: 'invalid_result',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should require storageLocation for products', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          // Missing storageLocation
          itemDetails: []
        }],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });
  });

  describe('Schema Defaults', () => {
    it('should set default status to pending', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: []
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.status).toBe('pending');
    });

    it('should set default priority to medium', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: []
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.priority).toBe('medium');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: []
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.createdAt).toBeDefined();
      expect(savedRecord.updatedAt).toBeDefined();
      expect(savedRecord.createdAt).toBeInstanceOf(Date);
      expect(savedRecord.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema Methods and Virtuals', () => {
    it('should populate related fields correctly', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        createdBy: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      const populatedRecord = await WarehouseApproval.findById(savedRecord._id)
        .populate('qcRecord')
        .populate('warehouse', 'name location')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('products.productId', 'name code');

      expect(populatedRecord.qcRecord).toBeDefined();
      expect(populatedRecord.warehouse.name).toBe(testWarehouse.name);
      expect(populatedRecord.assignedTo.name).toBe(testUser.name);
      expect(populatedRecord.createdBy.name).toBe(testUser.name);
      expect(populatedRecord.products[0].productId.name).toBe(testProduct.name);
    });

    it('should handle approval workflow fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'approved',
        approvedBy: testUser._id,
        approvedAt: new Date(),
        approvalRemarks: 'Warehouse approval completed'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.status).toBe('approved');
      expect(savedRecord.approvedBy.toString()).toBe(testUser._id.toString());
      expect(savedRecord.approvedAt).toBeInstanceOf(Date);
      expect(savedRecord.approvalRemarks).toBe('Warehouse approval completed');
    });

    it('should handle rejection workflow fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'rejected',
        rejectedBy: testUser._id,
        rejectedAt: new Date(),
        rejectionReason: 'Storage conditions not suitable'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.status).toBe('rejected');
      expect(savedRecord.rejectedBy.toString()).toBe(testUser._id.toString());
      expect(savedRecord.rejectedAt).toBeInstanceOf(Date);
      expect(savedRecord.rejectionReason).toBe('Storage conditions not suitable');
    });
  });

  describe('Complex Product Structure', () => {
    it('should handle multiple products with multiple items and storage locations', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [
          {
            productId: testProduct._id,
            qcPassedQty: 100,
            unit: 'pieces',
            batchNumber: 'BATCH001',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            storageLocation: 'A-01-001',
            approvalResult: 'approved',
            itemDetails: [
              {
                itemId: new mongoose.Types.ObjectId(),
                status: 'approved',
                reason: 'Storage conditions verified',
                inspectionNotes: 'Good storage location'
              },
              {
                itemId: new mongoose.Types.ObjectId(),
                status: 'rejected',
                reason: 'Damaged during handling',
                inspectionNotes: 'Visible damage'
              }
            ]
          },
          {
            productId: testProduct._id,
            qcPassedQty: 50,
            unit: 'pieces',
            batchNumber: 'BATCH002',
            expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
            storageLocation: 'B-02-005',
            approvalResult: 'pending',
            itemDetails: [
              {
                itemId: new mongoose.Types.ObjectId(),
                status: 'pending',
                reason: '',
                inspectionNotes: ''
              }
            ]
          }
        ]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.products).toHaveLength(2);
      expect(savedRecord.products[0].itemDetails).toHaveLength(2);
      expect(savedRecord.products[1].itemDetails).toHaveLength(1);
      expect(savedRecord.products[0].approvalResult).toBe('approved');
      expect(savedRecord.products[1].approvalResult).toBe('pending');
      expect(savedRecord.products[0].storageLocation).toBe('A-01-001');
      expect(savedRecord.products[1].storageLocation).toBe('B-02-005');
    });

    it('should validate required product fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          // Missing required productId
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          storageLocation: 'A-01-001',
          itemDetails: []
        }]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should validate required item detail fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          storageLocation: 'A-01-001',
          itemDetails: [{
            // Missing required itemId
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      
      await expect(approvalRecord.save()).rejects.toThrow();
    });

    it('should handle storage location validation', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'VALID-LOCATION-001',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.products[0].storageLocation).toBe('VALID-LOCATION-001');
    });
  });

  describe('Indexing and Queries', () => {
    beforeEach(async () => {
      // Create multiple warehouse approval records for testing queries
      const approvalRecords = [
        {
          qcRecord: testQCRecord._id,
          warehouse: testWarehouse._id,
          assignedTo: testUser._id,
          status: 'pending',
          priority: 'high',
          products: []
        },
        {
          qcRecord: testQCRecord._id,
          warehouse: testWarehouse._id,
          assignedTo: testUser._id,
          status: 'approved',
          priority: 'medium',
          products: []
        },
        {
          qcRecord: testQCRecord._id,
          warehouse: testWarehouse._id,
          assignedTo: testUser._id,
          status: 'rejected',
          priority: 'low',
          products: []
        }
      ];

      await WarehouseApproval.insertMany(approvalRecords);
    });

    it('should query by status', async () => {
      const pendingRecords = await WarehouseApproval.find({ status: 'pending' });
      const approvedRecords = await WarehouseApproval.find({ status: 'approved' });
      const rejectedRecords = await WarehouseApproval.find({ status: 'rejected' });

      expect(pendingRecords).toHaveLength(1);
      expect(approvedRecords).toHaveLength(1);
      expect(rejectedRecords).toHaveLength(1);
    });

    it('should query by warehouse', async () => {
      const warehouseRecords = await WarehouseApproval.find({ warehouse: testWarehouse._id });
      expect(warehouseRecords).toHaveLength(3);
    });

    it('should query by assignedTo', async () => {
      const userRecords = await WarehouseApproval.find({ assignedTo: testUser._id });
      expect(userRecords).toHaveLength(3);
    });

    it('should query by priority', async () => {
      const highPriorityRecords = await WarehouseApproval.find({ priority: 'high' });
      const mediumPriorityRecords = await WarehouseApproval.find({ priority: 'medium' });
      const lowPriorityRecords = await WarehouseApproval.find({ priority: 'low' });

      expect(highPriorityRecords).toHaveLength(1);
      expect(mediumPriorityRecords).toHaveLength(1);
      expect(lowPriorityRecords).toHaveLength(1);
    });

    it('should support compound queries', async () => {
      const pendingHighPriority = await WarehouseApproval.find({
        status: 'pending',
        priority: 'high'
      });

      expect(pendingHighPriority).toHaveLength(1);
    });

    it('should support date range queries', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const recentRecords = await WarehouseApproval.find({
        createdAt: { $gte: yesterday }
      });

      expect(recentRecords.length).toBeGreaterThan(0);
    });

    it('should query by QC record', async () => {
      const qcRecords = await WarehouseApproval.find({ qcRecord: testQCRecord._id });
      expect(qcRecords).toHaveLength(3);
    });
  });

  describe('Model Updates', () => {
    it('should update updatedAt timestamp on save', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: []
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();
      const originalUpdatedAt = savedRecord.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedRecord.generalRemarks = 'Updated remarks';
      const updatedRecord = await savedRecord.save();

      expect(updatedRecord.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should handle partial updates', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      const updatedRecord = await WarehouseApproval.findByIdAndUpdate(
        savedRecord._id,
        { status: 'in_progress', generalRemarks: 'Work in progress' },
        { new: true }
      );

      expect(updatedRecord.status).toBe('in_progress');
      expect(updatedRecord.generalRemarks).toBe('Work in progress');
    });

    it('should handle product updates', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      // Update product approval result
      savedRecord.products[0].approvalResult = 'approved';
      savedRecord.products[0].itemDetails[0].status = 'approved';
      savedRecord.products[0].itemDetails[0].reason = 'Storage verified';

      const updatedRecord = await savedRecord.save();

      expect(updatedRecord.products[0].approvalResult).toBe('approved');
      expect(updatedRecord.products[0].itemDetails[0].status).toBe('approved');
      expect(updatedRecord.products[0].itemDetails[0].reason).toBe('Storage verified');
    });
  });

  describe('Model Deletion', () => {
    it('should delete warehouse approval record successfully', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: []
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      await WarehouseApproval.findByIdAndDelete(savedRecord._id);

      const deletedRecord = await WarehouseApproval.findById(savedRecord._id);
      expect(deletedRecord).toBeNull();
    });

    it('should handle bulk deletion', async () => {
      const approvalRecords = [
        {
          qcRecord: testQCRecord._id,
          warehouse: testWarehouse._id,
          assignedTo: testUser._id,
          products: []
        },
        {
          qcRecord: testQCRecord._id,
          warehouse: testWarehouse._id,
          assignedTo: testUser._id,
          products: []
        }
      ];

      const savedRecords = await WarehouseApproval.insertMany(approvalRecords);
      const recordIds = savedRecords.map(record => record._id);

      await WarehouseApproval.deleteMany({ _id: { $in: recordIds } });

      const remainingRecords = await WarehouseApproval.find({ _id: { $in: recordIds } });
      expect(remainingRecords).toHaveLength(0);
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle inventory integration fields', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          qcPassedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          storageLocation: 'A-01-001',
          approvalResult: 'approved',
          inventoryIntegrated: true,
          inventoryIntegratedAt: new Date(),
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'approved',
            reason: 'Ready for inventory',
            inspectionNotes: 'All checks passed'
          }]
        }],
        status: 'approved'
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.products[0].inventoryIntegrated).toBe(true);
      expect(savedRecord.products[0].inventoryIntegratedAt).toBeInstanceOf(Date);
    });

    it('should handle workflow timestamps correctly', async () => {
      const approvalData = {
        qcRecord: testQCRecord._id,
        warehouse: testWarehouse._id,
        assignedTo: testUser._id,
        products: [],
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: testUser._id
      };

      const approvalRecord = new WarehouseApproval(approvalData);
      const savedRecord = await approvalRecord.save();

      expect(savedRecord.submittedAt).toBeInstanceOf(Date);
      expect(savedRecord.submittedBy.toString()).toBe(testUser._id.toString());
    });
  });
});