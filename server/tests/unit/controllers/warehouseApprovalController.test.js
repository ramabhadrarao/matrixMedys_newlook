// tests/unit/controllers/warehouseApprovalController.test.js
import {
  getWarehouseApprovals,
  getWarehouseApproval,
  createWarehouseApproval,
  updateWarehouseApproval,
  submitWarehouseApproval,
  approveWarehouseApproval,
  rejectWarehouseApproval,
  assignWarehouseApproval,
  getWarehouseApprovalDashboard,
  bulkAssignWarehouseApproval,
  getWarehouseWorkload,
  getWarehouseStatistics
} from '../../../controllers/warehouseApprovalController.js';

import {
  createTestUser,
  createTestAdmin,
  createTestPrincipal,
  createTestWarehouse,
  createTestProduct,
  createTestPurchaseOrder,
  createTestInvoiceReceiving,
  createTestQCRecord,
  createTestWarehouseApproval,
  mockRequest,
  mockResponse,
  mockNext,
  cleanupTestData
} from '../../helpers/testHelpers.js';

import WarehouseApproval from '../../../models/WarehouseApproval.js';
import QualityControl from '../../../models/QualityControl.js';

describe('WarehouseApproval Controller', () => {
  let testUser, testAdmin, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQC, testWarehouseApproval;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser(['warehouse:view', 'warehouse:create', 'warehouse:update']);
    testAdmin = await createTestAdmin();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    testQC = await createTestQCRecord(testInvoiceReceiving, testUser);
    
    // Set QC as approved for warehouse approval
    testQC.status = 'approved';
    testQC.products[0].qcResult = 'passed';
    await testQC.save();
    
    testWarehouseApproval = await createTestWarehouseApproval(testQC, testUser);
  });

  describe('getWarehouseApprovals', () => {
    it('should return paginated warehouse approval records', async () => {
      const req = mockRequest({
        query: { page: 1, limit: 10 },
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApprovals(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            warehouseApprovals: expect.any(Array),
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

    it('should filter warehouse approvals by status', async () => {
      const req = mockRequest({
        query: { status: 'pending' },
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApprovals(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.warehouseApprovals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'pending' })
        ])
      );
    });

    it('should filter by warehouse', async () => {
      const req = mockRequest({
        query: { warehouse: testWarehouse._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApprovals(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.warehouseApprovals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ warehouse: testWarehouse._id })
        ])
      );
    });
  });

  describe('getWarehouseApproval', () => {
    it('should return a specific warehouse approval record', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: testWarehouseApproval._id
          })
        })
      );
    });

    it('should return 404 for non-existent warehouse approval', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Warehouse approval record not found'
        })
      );
    });
  });

  describe('createWarehouseApproval', () => {
    it('should create a new warehouse approval record', async () => {
      // Create another QC record for testing
      const newQC = await createTestQCRecord(testInvoiceReceiving, testUser);
      newQC.status = 'approved';
      newQC.products[0].qcResult = 'passed';
      await newQC.save();
      
      const req = mockRequest({
        body: {
          qcRecord: newQC._id.toString(),
          warehouse: testWarehouse._id.toString(),
          assignedTo: testUser._id.toString(),
          products: newQC.products.map(product => ({
            productId: product.productId,
            approvedQty: product.itemDetails.reduce((sum, item) => sum + (item.status === 'passed' ? item.quantity : 0), 0),
            unit: product.unit,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate
          }))
        },
        user: testUser
      });
      const res = mockResponse();

      await createWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval record created successfully',
          data: expect.objectContaining({
            qcRecord: newQC._id,
            warehouse: testWarehouse._id,
            status: 'pending'
          })
        })
      );
    });

    it('should return 400 for invalid QC record', async () => {
      const req = mockRequest({
        body: {
          qcRecord: '507f1f77bcf86cd799439011',
          warehouse: testWarehouse._id.toString(),
          products: []
        },
        user: testUser
      });
      const res = mockResponse();

      await createWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateWarehouseApproval', () => {
    it('should update warehouse approval record successfully', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {
          products: [{
            productId: testWarehouseApproval.products[0].productId,
            approvalResult: 'approved',
            itemDetails: [{
              itemId: testWarehouseApproval.products[0].itemDetails[0].itemId,
              status: 'approved',
              reason: 'Physical inspection passed'
            }]
          }]
        },
        user: testUser
      });
      const res = mockResponse();

      await updateWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval record updated successfully'
        })
      );
    });

    it('should return 404 for non-existent warehouse approval', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        body: { products: [] },
        user: testUser
      });
      const res = mockResponse();

      await updateWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('submitWarehouseApproval', () => {
    it('should submit warehouse approval for final approval', async () => {
      // First update the warehouse approval with results
      testWarehouseApproval.products[0].approvalResult = 'approved';
      testWarehouseApproval.products[0].itemDetails[0].status = 'approved';
      await testWarehouseApproval.save();

      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {
          generalRemarks: 'All items approved for warehouse storage'
        },
        user: testUser
      });
      const res = mockResponse();

      await submitWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval submitted for final approval'
        })
      );
    });

    it('should return 400 if warehouse approval is not ready for submission', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {},
        user: testUser
      });
      const res = mockResponse();

      await submitWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('approveWarehouseApproval', () => {
    beforeEach(async () => {
      // Set up warehouse approval for final approval
      testWarehouseApproval.status = 'submitted';
      testWarehouseApproval.products[0].approvalResult = 'approved';
      testWarehouseApproval.products[0].itemDetails[0].status = 'approved';
      await testWarehouseApproval.save();
    });

    it('should approve warehouse approval successfully', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {
          finalApprovalRemarks: 'Warehouse approval completed - ready for inventory'
        },
        user: testAdmin
      });
      const res = mockResponse();

      await approveWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval completed successfully'
        })
      );
    });

    it('should return 400 if warehouse approval is not in submitted status', async () => {
      testWarehouseApproval.status = 'pending';
      await testWarehouseApproval.save();

      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {},
        user: testAdmin
      });
      const res = mockResponse();

      await approveWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rejectWarehouseApproval', () => {
    beforeEach(async () => {
      testWarehouseApproval.status = 'submitted';
      await testWarehouseApproval.save();
    });

    it('should reject warehouse approval successfully', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {
          rejectionReason: 'Storage conditions not met'
        },
        user: testAdmin
      });
      const res = mockResponse();

      await rejectWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval rejected'
        })
      );
    });

    it('should require rejection reason', async () => {
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {},
        user: testAdmin
      });
      const res = mockResponse();

      await rejectWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('assignWarehouseApproval', () => {
    it('should assign warehouse approval to user', async () => {
      const newUser = await createTestUser(['warehouse:view', 'warehouse:update']);
      
      const req = mockRequest({
        params: { id: testWarehouseApproval._id.toString() },
        body: {
          assignedTo: newUser._id.toString()
        },
        user: testAdmin
      });
      const res = mockResponse();

      await assignWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Warehouse approval assigned successfully'
        })
      );
    });
  });

  describe('getWarehouseApprovalDashboard', () => {
    it('should return warehouse approval dashboard statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApprovalDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRecords: expect.any(Number),
            statusBreakdown: expect.any(Object),
            resultBreakdown: expect.any(Object),
            warehouseStats: expect.any(Array),
            recentActivity: expect.any(Array)
          })
        })
      );
    });
  });

  describe('bulkAssignWarehouseApproval', () => {
    it('should assign multiple warehouse approvals to users', async () => {
      const newUser = await createTestUser(['warehouse:view', 'warehouse:update']);
      
      const req = mockRequest({
        body: {
          warehouseApprovalIds: [testWarehouseApproval._id.toString()],
          assignedTo: newUser._id.toString()
        },
        user: testAdmin
      });
      const res = mockResponse();

      await bulkAssignWarehouseApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Warehouse approval records assigned successfully')
        })
      );
    });
  });

  describe('getWarehouseWorkload', () => {
    it('should return warehouse workload statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseWorkload(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userWorkload: expect.any(Array),
            warehouseStats: expect.any(Array)
          })
        })
      );
    });
  });

  describe('getWarehouseStatistics', () => {
    it('should return warehouse statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statusStats: expect.any(Array),
            resultStats: expect.any(Array),
            warehouseStats: expect.any(Array)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(WarehouseApproval, 'find').mockRejectedValueOnce(new Error('Database error'));

      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getWarehouseApprovals(req, res);

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

      await getWarehouseApproval(req, res);

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