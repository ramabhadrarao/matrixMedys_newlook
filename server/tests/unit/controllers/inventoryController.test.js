// tests/unit/controllers/inventoryController.test.js
import {
  getInventoryRecords,
  getInventoryRecord,
  updateInventoryRecord,
  adjustStock,
  reserveStock,
  releaseReservation,
  transferStock,
  recordUtilization,
  getInventoryStatistics,
  getStockMovementHistory,
  getInventoryDashboard,
  bulkUpdateInventory,
  getInventoryAlerts,
  getInventoryValuation
} from '../../../controllers/inventoryController.js';

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

import Inventory from '../../../models/Inventory.js';

describe('Inventory Controller', () => {
  let testUser, testAdmin, testPrincipal, testWarehouse, testProduct, testPO, testInvoiceReceiving, testQC, testWarehouseApproval, testInventory;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test data
    testUser = await createTestUser(['inventory:view', 'inventory:create', 'inventory:update']);
    testAdmin = await createTestAdmin();
    testPrincipal = await createTestPrincipal();
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    testPO = await createTestPurchaseOrder(testPrincipal, [testProduct]);
    testInvoiceReceiving = await createTestInvoiceReceiving(testPO, testWarehouse, testUser);
    testQC = await createTestQCRecord(testInvoiceReceiving, testUser);
    testWarehouseApproval = await createTestWarehouseApproval(testQC, testUser);
    
    // Create test inventory record
    testInventory = new Inventory({
      product: testProduct._id,
      productCode: testProduct.code,
      productName: testProduct.name,
      batchNo: 'BATCH001',
      mfgDate: new Date('2024-01-01'),
      expDate: new Date('2025-12-31'),
      warehouse: testWarehouse._id,
      location: {
        zone: 'A',
        rack: '1',
        shelf: '2',
        bin: '3'
      },
      currentStock: 100,
      availableStock: 90,
      reservedStock: 10,
      minimumStock: 20,
      maximumStock: 200,
      reorderLevel: 30,
      unitCost: 10.50,
      totalValue: 1050,
      storageConditions: 'room_temperature',
      stockStatus: 'in_stock',
      createdBy: testUser._id
    });
    await testInventory.save();
  });

  describe('getInventoryRecords', () => {
    it('should return paginated inventory records', async () => {
      const req = mockRequest({
        query: { page: 1, limit: 10 },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventoryRecords: expect.any(Array),
            totalCount: expect.any(Number),
            currentPage: 1,
            totalPages: expect.any(Number)
          })
        })
      );
    });

    it('should filter inventory records by warehouse', async () => {
      const req = mockRequest({
        query: { warehouse: testWarehouse._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.inventoryRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ warehouse: testWarehouse._id })
        ])
      );
    });

    it('should filter by stock status', async () => {
      const req = mockRequest({
        query: { stockStatus: 'in_stock' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.inventoryRecords).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stockStatus: 'in_stock' })
        ])
      );
    });

    it('should filter by expiry status', async () => {
      const req = mockRequest({
        query: { expiryStatus: 'good' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should handle search functionality', async () => {
      const req = mockRequest({
        query: { search: testProduct.name },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.inventoryRecords.length).toBeGreaterThan(0);
    });
  });

  describe('getInventoryRecord', () => {
    it('should return a specific inventory record', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecord(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            _id: testInventory._id
          })
        })
      );
    });

    it('should return 404 for non-existent inventory record', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateInventoryRecord', () => {
    it('should update inventory record successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          minimumStock: 25,
          maximumStock: 250,
          reorderLevel: 35
        },
        user: testUser
      });
      const res = mockResponse();

      await updateInventoryRecord(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('updated successfully')
        })
      );
    });

    it('should return 404 for non-existent inventory record', async () => {
      const req = mockRequest({
        params: { id: '507f1f77bcf86cd799439011' },
        body: { minimumStock: 25 },
        user: testUser
      });
      const res = mockResponse();

      await updateInventoryRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock quantity successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          adjustmentType: 'increase',
          quantity: 50,
          reason: 'Stock replenishment',
          remarks: 'New stock received'
        },
        user: testUser
      });
      const res = mockResponse();

      await adjustStock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('adjusted successfully')
        })
      );
    });

    it('should handle stock decrease', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          adjustmentType: 'decrease',
          quantity: 20,
          reason: 'Damaged goods',
          remarks: 'Items damaged during handling'
        },
        user: testUser
      });
      const res = mockResponse();

      await adjustStock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('adjusted successfully')
        })
      );
    });

    it('should return 400 for insufficient stock on decrease', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          adjustmentType: 'decrease',
          quantity: 200, // More than available stock
          reason: 'Test'
        },
        user: testUser
      });
      const res = mockResponse();

      await adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 30,
          reason: 'Order fulfillment',
          referenceType: 'sales_order',
          referenceNumber: 'SO001'
        },
        user: testUser
      });
      const res = mockResponse();

      await reserveStock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reserved successfully')
        })
      );
    });

    it('should return 400 for insufficient available stock', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 100, // More than available stock (90)
          reason: 'Test'
        },
        user: testUser
      });
      const res = mockResponse();

      await reserveStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('releaseReservation', () => {
    beforeEach(async () => {
      // Add some reserved stock
      testInventory.reservedStock = 20;
      testInventory.availableStock = 80;
      await testInventory.save();
    });

    it('should release reservation successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 15,
          reason: 'Order cancelled'
        },
        user: testUser
      });
      const res = mockResponse();

      await releaseReservation(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('released successfully')
        })
      );
    });

    it('should return 400 for insufficient reserved stock', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 30, // More than reserved stock (20)
          reason: 'Test'
        },
        user: testUser
      });
      const res = mockResponse();

      await releaseReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('transferStock', () => {
    let targetWarehouse;

    beforeEach(async () => {
      targetWarehouse = new testWarehouse.constructor({
        name: 'Target Warehouse',
        code: 'TW001',
        location: 'Target Location',
        branch: testWarehouse.branch,
        state: testWarehouse.state,
        status: 'active',
        createdBy: testUser._id
      });
      await targetWarehouse.save();
    });

    it('should transfer stock to different warehouse successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 25,
          toWarehouse: targetWarehouse._id.toString(),
          toLocation: {
            zone: 'B',
            rack: '2',
            shelf: '3',
            bin: '4'
          },
          reason: 'Stock redistribution',
          referenceNumber: 'TR001'
        },
        user: testUser
      });
      const res = mockResponse();

      await transferStock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('transferred successfully')
        })
      );
    });

    it('should transfer stock within same warehouse (location change)', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 15,
          toLocation: {
            zone: 'B',
            rack: '2',
            shelf: '3',
            bin: '4'
          },
          reason: 'Location optimization'
        },
        user: testUser
      });
      const res = mockResponse();

      await transferStock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('transferred successfully')
        })
      );
    });
  });

  describe('recordUtilization', () => {
    it('should record stock utilization successfully', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          quantity: 10,
          utilizationType: 'consumption',
          reason: 'Patient treatment',
          referenceType: 'patient_record',
          referenceNumber: 'PR001'
        },
        user: testUser
      });
      const res = mockResponse();

      await recordUtilization(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('recorded successfully')
        })
      );
    });
  });

  describe('getInventoryStatistics', () => {
    it('should return inventory statistics', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getInventoryStatistics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overview: expect.any(Object),
            stockStatusBreakdown: expect.any(Array),
            alerts: expect.objectContaining({
              lowStock: expect.any(Number),
              nearExpiry: expect.any(Number),
              expired: expect.any(Number)
            }),
            topProductsByValue: expect.any(Array),
            warehouseBreakdown: expect.any(Array)
          })
        })
      );
    });

    it('should filter statistics by warehouse', async () => {
      const req = mockRequest({
        query: { warehouse: testWarehouse._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryStatistics(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getStockMovementHistory', () => {
    it('should return stock movement history', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        query: { page: 1, limit: 10 },
        user: testUser
      });
      const res = mockResponse();

      await getStockMovementHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            movements: expect.any(Array),
            totalCount: expect.any(Number)
          })
        })
      );
    });
  });

  describe('getInventoryDashboard', () => {
    it('should return inventory dashboard data', async () => {
      const req = mockRequest({
        query: { timeframe: '30' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statistics: expect.objectContaining({
              totalItems: expect.any(Number),
              totalValue: expect.any(Number),
              totalStock: expect.any(Number),
              lowStockItems: expect.any(Number),
              outOfStockItems: expect.any(Number),
              nearExpiryItems: expect.any(Number),
              expiredItems: expect.any(Number)
            }),
            recentMovements: expect.any(Array),
            topProductsByValue: expect.any(Array),
            warehouseDistribution: expect.any(Array)
          })
        })
      );
    });

    it('should filter dashboard by warehouse', async () => {
      const req = mockRequest({
        query: { warehouse: testWarehouse._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('bulkUpdateInventory', () => {
    it('should bulk update inventory records successfully', async () => {
      const req = mockRequest({
        body: {
          inventoryIds: [testInventory._id.toString()],
          updateData: {
            minimumStock: 30,
            maximumStock: 300,
            reorderLevel: 40
          }
        },
        user: testUser
      });
      const res = mockResponse();

      await bulkUpdateInventory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('inventory records updated successfully'),
          data: expect.objectContaining({
            modifiedCount: expect.any(Number)
          })
        })
      );
    });

    it('should return 400 for empty inventory IDs array', async () => {
      const req = mockRequest({
        body: {
          inventoryIds: [],
          updateData: { minimumStock: 30 }
        },
        user: testUser
      });
      const res = mockResponse();

      await bulkUpdateInventory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Inventory IDs array is required'
        })
      );
    });

    it('should return 400 for empty update data', async () => {
      const req = mockRequest({
        body: {
          inventoryIds: [testInventory._id.toString()],
          updateData: {}
        },
        user: testUser
      });
      const res = mockResponse();

      await bulkUpdateInventory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getInventoryAlerts', () => {
    beforeEach(async () => {
      // Create inventory with low stock
      testInventory.availableStock = 15; // Below minimum stock (20)
      await testInventory.save();

      // Create inventory with near expiry
      const nearExpiryInventory = new Inventory({
        product: testProduct._id,
        productCode: 'NEAR_EXP',
        productName: 'Near Expiry Product',
        batchNo: 'BATCH002',
        mfgDate: new Date('2024-01-01'),
        expDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        warehouse: testWarehouse._id,
        location: { zone: 'A', rack: '1', shelf: '1', bin: '1' },
        currentStock: 50,
        availableStock: 50,
        minimumStock: 10,
        unitCost: 5.00,
        totalValue: 250,
        createdBy: testUser._id
      });
      await nearExpiryInventory.save();
    });

    it('should return all inventory alerts', async () => {
      const req = mockRequest({
        query: { alertType: 'all' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lowStock: expect.any(Array),
            outOfStock: expect.any(Array),
            nearExpiry: expect.any(Array),
            expired: expect.any(Array),
            summary: expect.objectContaining({
              totalAlerts: expect.any(Number),
              lowStockCount: expect.any(Number),
              outOfStockCount: expect.any(Number),
              nearExpiryCount: expect.any(Number),
              expiredCount: expect.any(Number)
            })
          })
        })
      );
    });

    it('should return low stock alerts only', async () => {
      const req = mockRequest({
        query: { alertType: 'low_stock' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.lowStock.length).toBeGreaterThan(0);
    });

    it('should filter alerts by warehouse', async () => {
      const req = mockRequest({
        query: { 
          warehouse: testWarehouse._id.toString(),
          alertType: 'all'
        },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getInventoryValuation', () => {
    it('should return inventory valuation report', async () => {
      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getInventoryValuation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overallTotals: expect.objectContaining({
              totalItems: expect.any(Number),
              totalStock: expect.any(Number),
              totalValue: expect.any(Number),
              availableStock: expect.any(Number),
              availableValue: expect.any(Number),
              reservedStock: expect.any(Number),
              reservedValue: expect.any(Number)
            }),
            warehouseValuation: expect.any(Array),
            categoryValuation: expect.any(Array)
          })
        })
      );
    });

    it('should filter valuation by warehouse', async () => {
      const req = mockRequest({
        query: { warehouse: testWarehouse._id.toString() },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryValuation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter valuation by date range', async () => {
      const req = mockRequest({
        query: { 
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31'
        },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryValuation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(Inventory, 'find').mockRejectedValueOnce(new Error('Database error'));

      const req = mockRequest({
        query: {},
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle invalid ObjectId format', async () => {
      const req = mockRequest({
        params: { id: 'invalid-id' },
        user: testUser
      });
      const res = mockResponse();

      await getInventoryRecord(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle missing required fields', async () => {
      const req = mockRequest({
        params: { id: testInventory._id.toString() },
        body: {
          // Missing required fields for stock adjustment
        },
        user: testUser
      });
      const res = mockResponse();

      await adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});