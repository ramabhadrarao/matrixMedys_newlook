// tests/unit/models/QualityControl.test.js
import mongoose from 'mongoose';
import QualityControl from '../../../models/QualityControl.js';
import {
  createTestUser,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('QualityControl Model Tests', () => {
  let testUser, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
  });

  describe('Schema Validation', () => {
    it('should create a valid QC record with required fields', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord._id).toBeDefined();
      expect(savedRecord.invoiceReceiving.toString()).toBe(testInvoiceReceiving._id.toString());
      expect(savedRecord.qcType).toBe('incoming_inspection');
      expect(savedRecord.status).toBe('pending');
      expect(savedRecord.createdAt).toBeDefined();
      expect(savedRecord.updatedAt).toBeDefined();
    });

    it('should require invoiceReceiving field', async () => {
      const qcData = {
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should require qcType field', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should validate qcType enum values', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'invalid_type',
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [],
        status: 'invalid_status'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should validate product item status enum values', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'invalid_status',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should validate qcResult enum values', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          qcResult: 'invalid_result',
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });
  });

  describe('Schema Defaults', () => {
    it('should set default status to pending', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: []
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.status).toBe('pending');
    });

    it('should set default priority to medium', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: []
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.priority).toBe('medium');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: []
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.createdAt).toBeDefined();
      expect(savedRecord.updatedAt).toBeDefined();
      expect(savedRecord.createdAt).toBeInstanceOf(Date);
      expect(savedRecord.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema Methods and Virtuals', () => {
    it('should populate related fields correctly', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        createdBy: testUser._id,
        products: [{
          productId: testProduct._id,
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          itemDetails: [{
            itemId: new mongoose.Types.ObjectId(),
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      const populatedRecord = await QualityControl.findById(savedRecord._id)
        .populate('invoiceReceiving')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('products.productId', 'name code');

      expect(populatedRecord.invoiceReceiving).toBeDefined();
      expect(populatedRecord.assignedTo.name).toBe(testUser.name);
      expect(populatedRecord.createdBy.name).toBe(testUser.name);
      expect(populatedRecord.products[0].productId.name).toBe(testProduct.name);
    });

    it('should handle approval workflow fields', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [],
        status: 'approved',
        approvedBy: testUser._id,
        approvedAt: new Date(),
        approvalRemarks: 'Quality check passed'
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.status).toBe('approved');
      expect(savedRecord.approvedBy.toString()).toBe(testUser._id.toString());
      expect(savedRecord.approvedAt).toBeInstanceOf(Date);
      expect(savedRecord.approvalRemarks).toBe('Quality check passed');
    });

    it('should handle rejection workflow fields', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [],
        status: 'rejected',
        rejectedBy: testUser._id,
        rejectedAt: new Date(),
        rejectionReason: 'Quality standards not met'
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.status).toBe('rejected');
      expect(savedRecord.rejectedBy.toString()).toBe(testUser._id.toString());
      expect(savedRecord.rejectedAt).toBeInstanceOf(Date);
      expect(savedRecord.rejectionReason).toBe('Quality standards not met');
    });
  });

  describe('Complex Product Structure', () => {
    it('should handle multiple products with multiple items', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [
          {
            productId: testProduct._id,
            receivedQty: 100,
            unit: 'pieces',
            batchNumber: 'BATCH001',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            qcResult: 'passed',
            itemDetails: [
              {
                itemId: new mongoose.Types.ObjectId(),
                status: 'passed',
                reason: 'Quality check passed',
                inspectionNotes: 'Good condition'
              },
              {
                itemId: new mongoose.Types.ObjectId(),
                status: 'failed',
                reason: 'Damaged packaging',
                inspectionNotes: 'Visible damage'
              }
            ]
          },
          {
            productId: testProduct._id,
            receivedQty: 50,
            unit: 'pieces',
            batchNumber: 'BATCH002',
            expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
            qcResult: 'pending',
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

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      expect(savedRecord.products).toHaveLength(2);
      expect(savedRecord.products[0].itemDetails).toHaveLength(2);
      expect(savedRecord.products[1].itemDetails).toHaveLength(1);
      expect(savedRecord.products[0].qcResult).toBe('passed');
      expect(savedRecord.products[1].qcResult).toBe('pending');
    });

    it('should validate required product fields', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [{
          // Missing required productId
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          itemDetails: []
        }]
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });

    it('should validate required item detail fields', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [{
          productId: testProduct._id,
          receivedQty: 100,
          unit: 'pieces',
          batchNumber: 'BATCH001',
          itemDetails: [{
            // Missing required itemId
            status: 'pending',
            reason: '',
            inspectionNotes: ''
          }]
        }]
      };

      const qcRecord = new QualityControl(qcData);
      
      await expect(qcRecord.save()).rejects.toThrow();
    });
  });

  describe('Indexing and Queries', () => {
    beforeEach(async () => {
      // Create multiple QC records for testing queries
      const qcRecords = [
        {
          invoiceReceiving: testInvoiceReceiving._id,
          qcType: 'incoming_inspection',
          assignedTo: testUser._id,
          status: 'pending',
          priority: 'high',
          products: []
        },
        {
          invoiceReceiving: testInvoiceReceiving._id,
          qcType: 'batch_testing',
          assignedTo: testUser._id,
          status: 'approved',
          priority: 'medium',
          products: []
        },
        {
          invoiceReceiving: testInvoiceReceiving._id,
          qcType: 'stability_testing',
          assignedTo: testUser._id,
          status: 'rejected',
          priority: 'low',
          products: []
        }
      ];

      await QualityControl.insertMany(qcRecords);
    });

    it('should query by status', async () => {
      const pendingRecords = await QualityControl.find({ status: 'pending' });
      const approvedRecords = await QualityControl.find({ status: 'approved' });
      const rejectedRecords = await QualityControl.find({ status: 'rejected' });

      expect(pendingRecords).toHaveLength(1);
      expect(approvedRecords).toHaveLength(1);
      expect(rejectedRecords).toHaveLength(1);
    });

    it('should query by qcType', async () => {
      const incomingRecords = await QualityControl.find({ qcType: 'incoming_inspection' });
      const batchRecords = await QualityControl.find({ qcType: 'batch_testing' });
      const stabilityRecords = await QualityControl.find({ qcType: 'stability_testing' });

      expect(incomingRecords).toHaveLength(1);
      expect(batchRecords).toHaveLength(1);
      expect(stabilityRecords).toHaveLength(1);
    });

    it('should query by assignedTo', async () => {
      const userRecords = await QualityControl.find({ assignedTo: testUser._id });
      expect(userRecords).toHaveLength(3);
    });

    it('should query by priority', async () => {
      const highPriorityRecords = await QualityControl.find({ priority: 'high' });
      const mediumPriorityRecords = await QualityControl.find({ priority: 'medium' });
      const lowPriorityRecords = await QualityControl.find({ priority: 'low' });

      expect(highPriorityRecords).toHaveLength(1);
      expect(mediumPriorityRecords).toHaveLength(1);
      expect(lowPriorityRecords).toHaveLength(1);
    });

    it('should support compound queries', async () => {
      const pendingHighPriority = await QualityControl.find({
        status: 'pending',
        priority: 'high'
      });

      expect(pendingHighPriority).toHaveLength(1);
    });

    it('should support date range queries', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const recentRecords = await QualityControl.find({
        createdAt: { $gte: yesterday }
      });

      expect(recentRecords.length).toBeGreaterThan(0);
    });
  });

  describe('Model Updates', () => {
    it('should update updatedAt timestamp on save', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: []
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();
      const originalUpdatedAt = savedRecord.updatedAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedRecord.generalRemarks = 'Updated remarks';
      const updatedRecord = await savedRecord.save();

      expect(updatedRecord.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should handle partial updates', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: [],
        status: 'pending'
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      const updatedRecord = await QualityControl.findByIdAndUpdate(
        savedRecord._id,
        { status: 'in_progress', generalRemarks: 'Work in progress' },
        { new: true }
      );

      expect(updatedRecord.status).toBe('in_progress');
      expect(updatedRecord.generalRemarks).toBe('Work in progress');
    });
  });

  describe('Model Deletion', () => {
    it('should delete QC record successfully', async () => {
      const qcData = {
        invoiceReceiving: testInvoiceReceiving._id,
        qcType: 'incoming_inspection',
        assignedTo: testUser._id,
        products: []
      };

      const qcRecord = new QualityControl(qcData);
      const savedRecord = await qcRecord.save();

      await QualityControl.findByIdAndDelete(savedRecord._id);

      const deletedRecord = await QualityControl.findById(savedRecord._id);
      expect(deletedRecord).toBeNull();
    });

    it('should handle bulk deletion', async () => {
      const qcRecords = [
        {
          invoiceReceiving: testInvoiceReceiving._id,
          qcType: 'incoming_inspection',
          assignedTo: testUser._id,
          products: []
        },
        {
          invoiceReceiving: testInvoiceReceiving._id,
          qcType: 'batch_testing',
          assignedTo: testUser._id,
          products: []
        }
      ];

      const savedRecords = await QualityControl.insertMany(qcRecords);
      const recordIds = savedRecords.map(record => record._id);

      await QualityControl.deleteMany({ _id: { $in: recordIds } });

      const remainingRecords = await QualityControl.find({ _id: { $in: recordIds } });
      expect(remainingRecords).toHaveLength(0);
    });
  });
});