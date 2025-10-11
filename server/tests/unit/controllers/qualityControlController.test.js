// tests/unit/controllers/qualityControlController.test.js
import {
  getQCRecords,
  getQCRecord,
  createQCRecord,
  updateQCRecord,
  submitQCRecord,
  approveQCRecord,
  rejectQCRecord,
  assignQCRecord,
  getQCDashboard,
  bulkAssignQC,
  getQCWorkload,
  getQCStatistics
} from '../../../controllers/qualityControlController.js';

import {
  createTestUser,
  createTestAdmin,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  createTestQCRecord,
  mockRequest,
  mockResponse,
  mockNext,
  cleanupTestData
} from '../../helpers/testHelpers.js';

import QualityControl from '../../../models/QualityControl.js';
import InvoiceReceiving from '../../../models/InvoiceReceiving.js';

describe('QualityControl Controller', () => {
  let testUser, testAdmin, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQC;

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
    testQC = await createTestQCRecord(testInvoiceReceiving, testUser);
  });

  describe('getQCRecords', () => {
    it('should return paginated QC records', async () => {
      const req = mockRequest({
        query: { page: 1, limit: 10 },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            qcRecords: expect.any(Array),
            pagination: expect.objectContaining({
              currentPage: 1,
              totalPages: expect.any(Number),
              totalRecords: expect.any(Number),
              hasNext: expect.any(Boolean),
              hasPrev: expect.any(Boolean)
            })
          })
        })
      );
    });

    it('should filter QC records by status', async () => {
      const req = mockRequest({
        query: { status: 'pending' },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.qcRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'pending' })
        ])
      );
    });

    it('should handle search functionality', async () => {
      const req = mockRequest({
        query: { search: testInvoiceReceiving.invoiceNumber },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.qcRecords.length).toBeGreaterThan(0);
    });
  });

  describe('getQCRecord', () => {
    it('should return a specific QC record', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: testQC._id
          })
        })
      );
    });

    it('should return 404 for non-existent QC record', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'QC record not found'
        })
      );
    });
  });

  describe('createQCRecord', () => {
    it('should create a new QC record', async () => {
      // Create another invoice receiving for testing
      const newInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
      
      const req = mockRequest({
        body: {
          invoiceReceiving: newInvoiceReceiving._id.toString(),
          qcType: 'incoming_inspection',
          assignedTo: testUser._id.toString(),
          products: newInvoiceReceiving.products.map(product => ({
            productId: product.product,
            receivedQty: product.receivedQty,
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        },
        user: testUser
      });
      const res = mockResponse();

      await createQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record created successfully',
          data: expect.objectContaining({
            invoiceReceiving: newInvoiceReceiving._id,
            qcType: 'incoming_inspection',
            status: 'pending'
          })
        })
      );
    });

    it('should return 400 for invalid data', async () => {
      const req = mockRequest({
        body: {
          // Missing required fields
        },
        user: testUser
      });
      const res = mockResponse();

      await createQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateQCRecord', () => {
    it('should update QC record successfully', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {
          products: [{
            productId: testQC.products[0].productId,
            qcResult: 'passed',
            itemDetails: [{
              itemId: testQC.products[0].itemDetails[0].itemId,
              status: 'passed',
              reason: 'Quality check passed'
            }]
          }]
        },
        user: testUser
      });
      const res = mockResponse();

      await updateQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record updated successfully'
        })
      );
    });

    it('should return 404 for non-existent QC record', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        body: { products: [] },
        user: testUser
      });
      const res = mockResponse();

      await updateQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('submitQCRecord', () => {
    it('should submit QC record for approval', async () => {
      // First update the QC record with results
      testQC.products[0].qcResult = 'passed';
      testQC.products[0].itemDetails[0].status = 'passed';
      await testQC.save();

      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {
          generalRemarks: 'All items passed quality check'
        },
        user: testUser
      });
      const res = mockResponse();

      await submitQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record submitted for approval'
        })
      );
    });

    it('should return 400 if QC record is not ready for submission', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {},
        user: testUser
      });
      const res = mockResponse();

      await submitQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('approveQCRecord', () => {
    beforeEach(async () => {
      // Set up QC record for approval
      testQC.status = 'submitted';
      testQC.products[0].qcResult = 'passed';
      testQC.products[0].itemDetails[0].status = 'passed';
      await testQC.save();
    });

    it('should approve QC record successfully', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {
          approvalRemarks: 'QC approved - all checks passed'
        },
        user: testAdmin
      });
      const res = mockResponse();

      await approveQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record approved successfully'
        })
      );
    });

    it('should return 400 if QC record is not in submitted status', async () => {
      testQC.status = 'pending';
      await testQC.save();

      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {},
        user: testAdmin
      });
      const res = mockResponse();

      await approveQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rejectQCRecord', () => {
    beforeEach(async () => {
      testQC.status = 'submitted';
      await testQC.save();
    });

    it('should reject QC record successfully', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {
          rejectionReason: 'Incomplete documentation'
        },
        user: testAdmin
      });
      const res = mockResponse();

      await rejectQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record rejected'
        })
      );
    });

    it('should require rejection reason', async () => {
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {},
        user: testAdmin
      });
      const res = mockResponse();

      await rejectQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('assignQCRecord', () => {
    it('should assign QC record to user', async () => {
      const newUser = await createTestUser(['quality_control:view', 'quality_control:update']);
      
      const req = mockRequest({
        params: { id: testQC._id.toString() },
        body: {
          assignedTo: newUser._id.toString()
        },
        user: testAdmin
      });
      const res = mockResponse();

      await assignQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'QC record assigned successfully'
        })
      );
    });
  });

  describe('getQCDashboard', () => {
    it('should return QC dashboard statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getQCDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRecords: expect.any(Number),
            statusBreakdown: expect.any(Object),
            resultBreakdown: expect.any(Object),
            recentActivity: expect.any(Array)
          })
        })
      );
    });
  });

  describe('bulkAssignQC', () => {
    it('should assign multiple QC records to users', async () => {
      const newUser = await createTestUser(['quality_control:view', 'quality_control:update']);
      
      const req = mockRequest({
        body: {
          qcIds: [testQC._id.toString()],
          assignedTo: newUser._id.toString()
        },
        user: testAdmin
      });
      const res = mockResponse();

      await bulkAssignQC(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('QC records assigned successfully')
        })
      );
    });
  });

  describe('getQCWorkload', () => {
    it('should return QC workload statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getQCWorkload(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userWorkload: expect.any(Array),
            departmentStats: expect.any(Object)
          })
        })
      );
    });
  });

  describe('getQCStatistics', () => {
    it('should return QC statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getQCStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statusStats: expect.any(Array),
            resultStats: expect.any(Array),
            typeStats: expect.any(Array)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(QualityControl, 'find').mockRejectedValueOnce(new Error('Database error'));

      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getQCRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error'
        })
      );
    });

    it('should handle invalid ObjectId format', async () => {
      const req = mockRequest({
        params: { id: 'invalid-id' },
        user: testUser
      });
      const res = mockResponse();

      await getQCRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid')
        })
      );
    });
  });
});