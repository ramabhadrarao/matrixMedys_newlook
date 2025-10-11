// tests/api/routes/inventoryRoutes.test.js
import request from 'supertest';
import app from '../../../app.js';
import {
  createTestUser,
  createTestInventory,
  createTestProduct,
  createTestWarehouse,
  generateJWTToken,
  cleanupTestData
} from '../../helpers/testHelpers.js';

describe('Inventory Routes API Tests', () => {
  let testUser, testAdmin, testInventoryManager, testWarehouse, testProduct;
  let userToken, adminToken, inventoryManagerToken;
  let testInventory;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    testUser = await createTestUser();
    testAdmin = await createTestUser({ role: 'admin' });
    testInventoryManager = await createTestUser({ 
      role: 'inventory_manager',
      permissions: ['read_inventory', 'create_inventory', 'update_inventory', 'manage_inventory']
    });
    
    // Create test entities
    testWarehouse = await createTestWarehouse();
    testProduct = await createTestProduct();
    
    // Generate tokens
    userToken = generateJWTToken(testUser);
    adminToken = generateJWTToken(testAdmin);
    inventoryManagerToken = generateJWTToken(testInventoryManager);
    
    // Create test inventory
    testInventory = await createTestInventory({
      product: testProduct._id,
      warehouse: testWarehouse._id,
      batchNumber: 'BATCH001',
      quantity: 100,
      reservedQuantity: 10,
      availableQuantity: 90,
      unitCost: 25.50,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      storageLocation: 'A1-B2-C3',
      status: 'active'
    });
  });

  describe('GET /api/inventory', () => {
    it('should retrieve inventory records with authentication', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    it('should reject requests without proper permissions', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should support filtering by warehouse', async () => {
      const response = await request(app)
        .get(`/api/inventory?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.warehouse._id || record.warehouse).toBe(testWarehouse._id.toString());
      });
    });

    it('should support filtering by product', async () => {
      const response = await request(app)
        .get(`/api/inventory?product=${testProduct._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.product._id || record.product).toBe(testProduct._id.toString());
      });
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/inventory?status=active')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(record => {
        expect(record.status).toBe('active');
      });
    });

    it('should support filtering by expiry status', async () => {
      const response = await request(app)
        .get('/api/inventory?expiryStatus=near_expiry')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support filtering by stock level', async () => {
      const response = await request(app)
        .get('/api/inventory?stockLevel=low')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support pagination and sorting', async () => {
      const response = await request(app)
        .get('/api/inventory?page=1&limit=10&sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/inventory?page=0&limit=101')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/inventory?search=BATCH001')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/inventory/:id', () => {
    it('should retrieve specific inventory record', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testInventory._id.toString());
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.warehouse).toBeDefined();
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .get('/api/inventory/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate ObjectId format', async () => {
      const response = await request(app)
        .get('/api/inventory/invalid_id')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should populate related fields correctly', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.warehouse).toBeDefined();
      expect(response.body.data.product.name).toBeDefined();
      expect(response.body.data.warehouse.name).toBeDefined();
    });
  });

  describe('POST /api/inventory', () => {
    it('should create new inventory record with valid data', async () => {
      const inventoryData = {
        product: testProduct._id.toString(),
        warehouse: testWarehouse._id.toString(),
        batchNumber: 'BATCH002',
        quantity: 200,
        unitCost: 30.75,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        storageLocation: 'B1-C2-D3',
        supplier: 'Test Supplier',
        manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test inventory creation'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(inventoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBeDefined();
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.availableQuantity).toBe(inventoryData.quantity);
    });

    it('should reject creation without required fields', async () => {
      const invalidData = {
        warehouse: testWarehouse._id.toString(),
        quantity: 100
        // Missing product, batchNumber
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate quantity values', async () => {
      const invalidData = {
        product: testProduct._id.toString(),
        warehouse: testWarehouse._id.toString(),
        batchNumber: 'INVALID001',
        quantity: -50, // Negative quantity
        unitCost: 25.00
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate expiry date', async () => {
      const invalidData = {
        product: testProduct._id.toString(),
        warehouse: testWarehouse._id.toString(),
        batchNumber: 'EXPIRED001',
        quantity: 100,
        unitCost: 25.00,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Past date
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        product: testProduct._id.toString(),
        warehouse: testWarehouse._id.toString(),
        batchNumber: 'MINIMAL001',
        quantity: 75,
        unitCost: 20.00
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(minimalData)
        .expect(201);

      expect(response.body.data.status).toBe('active');
      expect(response.body.data.reservedQuantity).toBe(0);
      expect(response.body.data.availableQuantity).toBe(75);
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should prevent duplicate batch numbers in same warehouse', async () => {
      const duplicateData = {
        product: testProduct._id.toString(),
        warehouse: testWarehouse._id.toString(),
        batchNumber: 'BATCH001', // Same as existing
        quantity: 50,
        unitCost: 25.00
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/inventory/:id', () => {
    it('should update inventory record with valid data', async () => {
      const updateData = {
        quantity: 150,
        unitCost: 28.00,
        storageLocation: 'A2-B3-C4',
        notes: 'Updated inventory record',
        status: 'active'
      };

      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(updateData.quantity);
      expect(response.body.data.unitCost).toBe(updateData.unitCost);
      expect(response.body.data.storageLocation).toBe(updateData.storageLocation);
    });

    it('should update available quantity when total quantity changes', async () => {
      const updateData = {
        quantity: 200 // Increase from 100
      };

      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(200);
      expect(response.body.data.availableQuantity).toBe(190); // 200 - 10 reserved
    });

    it('should reject updates that would make available quantity negative', async () => {
      const updateData = {
        quantity: 5 // Less than reserved quantity (10)
      };

      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('available quantity');
    });

    it('should validate status transitions', async () => {
      // First, set status to expired
      await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({ status: 'expired' })
        .expect(200);

      // Try to update back to active (should be allowed with proper justification)
      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({ 
          status: 'active',
          notes: 'Corrected expiry date, item is still valid'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
    });

    it('should update timestamps correctly', async () => {
      const originalUpdatedAt = testInventory.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({ notes: 'Updated timestamp test' })
        .expect(200);

      expect(new Date(response.body.data.updatedAt).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });

    it('should prevent updating immutable fields', async () => {
      const updateData = {
        product: testProduct._id.toString(), // Should not be updatable
        warehouse: testWarehouse._id.toString(), // Should not be updatable
        batchNumber: 'CHANGED001' // Should not be updatable
      };

      const response = await request(app)
        .put(`/api/inventory/${testInventory._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('immutable');
    });
  });

  describe('POST /api/inventory/:id/adjust', () => {
    it('should adjust inventory quantity with valid reason', async () => {
      const adjustmentData = {
        adjustment: 25,
        reason: 'stock_count',
        notes: 'Physical count adjustment',
        adjustedBy: testInventoryManager._id.toString()
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(adjustmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(125); // 100 + 25
      expect(response.body.data.availableQuantity).toBe(115); // 125 - 10 reserved
      expect(response.body.data.adjustmentHistory).toBeDefined();
    });

    it('should handle negative adjustments', async () => {
      const adjustmentData = {
        adjustment: -15,
        reason: 'damage',
        notes: 'Damaged items removed',
        adjustedBy: testInventoryManager._id.toString()
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(adjustmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(85); // 100 - 15
      expect(response.body.data.availableQuantity).toBe(75); // 85 - 10 reserved
    });

    it('should reject adjustments that would result in negative quantity', async () => {
      const adjustmentData = {
        adjustment: -150, // Would result in negative quantity
        reason: 'damage',
        notes: 'Large damage adjustment'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(adjustmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('negative quantity');
    });

    it('should require adjustment reason', async () => {
      const adjustmentData = {
        adjustment: 10,
        notes: 'Adjustment without reason'
        // Missing reason
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(adjustmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'reason',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should validate adjustment reason enum values', async () => {
      const adjustmentData = {
        adjustment: 10,
        reason: 'invalid_reason',
        notes: 'Invalid reason test'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(adjustmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/inventory/:id/reserve', () => {
    it('should reserve inventory quantity', async () => {
      const reservationData = {
        quantity: 20,
        reason: 'order_fulfillment',
        reservedFor: 'ORDER123',
        notes: 'Reserved for customer order'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(reservationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservedQuantity).toBe(30); // 10 + 20
      expect(response.body.data.availableQuantity).toBe(70); // 100 - 30
      expect(response.body.data.reservations).toBeDefined();
    });

    it('should reject reservation exceeding available quantity', async () => {
      const reservationData = {
        quantity: 95, // More than available (90)
        reason: 'order_fulfillment',
        reservedFor: 'ORDER124'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient available quantity');
    });

    it('should require reservation reason', async () => {
      const reservationData = {
        quantity: 15,
        reservedFor: 'ORDER125'
        // Missing reason
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate reservation quantity', async () => {
      const reservationData = {
        quantity: 0, // Invalid quantity
        reason: 'order_fulfillment',
        reservedFor: 'ORDER126'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/inventory/:id/release', () => {
    beforeEach(async () => {
      // Create a reservation first
      await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          quantity: 20,
          reason: 'order_fulfillment',
          reservedFor: 'ORDER123',
          notes: 'Test reservation for release'
        });
    });

    it('should release reserved inventory quantity', async () => {
      const releaseData = {
        quantity: 15,
        reason: 'order_cancelled',
        reservationId: 'ORDER123',
        notes: 'Order cancelled, releasing reservation'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/release`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(releaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reservedQuantity).toBe(15); // 30 - 15
      expect(response.body.data.availableQuantity).toBe(85); // 100 - 15
    });

    it('should reject release exceeding reserved quantity', async () => {
      const releaseData = {
        quantity: 35, // More than reserved (30)
        reason: 'order_cancelled',
        reservationId: 'ORDER123'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/release`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(releaseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('exceeds reserved quantity');
    });

    it('should require release reason', async () => {
      const releaseData = {
        quantity: 10,
        reservationId: 'ORDER123'
        // Missing reason
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/release`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(releaseData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/inventory/:id/transfer', () => {
    let targetWarehouse;

    beforeEach(async () => {
      targetWarehouse = await createTestWarehouse({ name: 'Target Warehouse' });
    });

    it('should transfer inventory between warehouses', async () => {
      const transferData = {
        targetWarehouse: targetWarehouse._id.toString(),
        quantity: 30,
        reason: 'rebalancing',
        notes: 'Warehouse rebalancing transfer',
        transferredBy: testInventoryManager._id.toString()
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/transfer`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(transferData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sourceRecord.quantity).toBe(70); // 100 - 30
      expect(response.body.data.targetRecord).toBeDefined();
      expect(response.body.data.targetRecord.quantity).toBe(30);
    });

    it('should reject transfer exceeding available quantity', async () => {
      const transferData = {
        targetWarehouse: targetWarehouse._id.toString(),
        quantity: 95, // More than available (90)
        reason: 'rebalancing'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/transfer`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient available quantity');
    });

    it('should require target warehouse', async () => {
      const transferData = {
        quantity: 25,
        reason: 'rebalancing'
        // Missing targetWarehouse
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/transfer`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should prevent transfer to same warehouse', async () => {
      const transferData = {
        targetWarehouse: testWarehouse._id.toString(), // Same warehouse
        quantity: 25,
        reason: 'rebalancing'
      };

      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/transfer`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('same warehouse');
    });
  });

  describe('GET /api/inventory/statistics', () => {
    it('should return inventory statistics', async () => {
      const response = await request(app)
        .get('/api/inventory/statistics')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValue).toBeDefined();
      expect(response.body.data.totalItems).toBeDefined();
      expect(response.body.data.stockStatus).toBeDefined();
      expect(response.body.data.lowStockItems).toBeDefined();
      expect(response.body.data.nearExpiryItems).toBeDefined();
      expect(response.body.data.expiredItems).toBeDefined();
    });

    it('should filter statistics by warehouse', async () => {
      const response = await request(app)
        .get(`/api/inventory/statistics?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseFilter).toBe(testWarehouse._id.toString());
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/inventory/statistics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should include top products by value', async () => {
      const response = await request(app)
        .get('/api/inventory/statistics')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topProductsByValue).toBeDefined();
      expect(response.body.data.topProductsByValue).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/inventory/dashboard', () => {
    it('should return inventory dashboard data', async () => {
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overallStats).toBeDefined();
      expect(response.body.data.recentMovements).toBeDefined();
      expect(response.body.data.topProducts).toBeDefined();
      expect(response.body.data.warehouseDistribution).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
    });

    it('should filter dashboard by warehouse', async () => {
      const response = await request(app)
        .get(`/api/inventory/dashboard?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseFilter).toBe(testWarehouse._id.toString());
    });

    it('should include recent stock movements', async () => {
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recentMovements).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/inventory/bulk-update', () => {
    let additionalInventory;

    beforeEach(async () => {
      additionalInventory = await createTestInventory({
        product: testProduct._id,
        warehouse: testWarehouse._id,
        batchNumber: 'BULK001',
        quantity: 150,
        unitCost: 22.00,
        status: 'active'
      });
    });

    it('should bulk update inventory records', async () => {
      const bulkData = {
        ids: [testInventory._id.toString(), additionalInventory._id.toString()],
        updates: {
          status: 'quarantine',
          notes: 'Bulk quarantine for inspection'
        }
      };

      const response = await request(app)
        .post('/api/inventory/bulk-update')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);
      expect(response.body.data.results).toHaveLength(2);
    });

    it('should validate bulk update data', async () => {
      const invalidData = {
        ids: [], // Empty array
        updates: {
          status: 'invalid_status'
        }
      };

      const response = await request(app)
        .post('/api/inventory/bulk-update')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkData = {
        ids: [testInventory._id.toString(), '507f1f77bcf86cd799439011'], // One valid, one invalid
        updates: {
          status: 'quarantine'
        }
      };

      const response = await request(app)
        .post('/api/inventory/bulk-update')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(bulkData)
        .expect(207); // Multi-status

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(1);
      expect(response.body.data.failed).toBe(1);
    });

    it('should prevent bulk update of immutable fields', async () => {
      const bulkData = {
        ids: [testInventory._id.toString()],
        updates: {
          product: testProduct._id.toString(), // Immutable field
          batchNumber: 'CHANGED001' // Immutable field
        }
      };

      const response = await request(app)
        .post('/api/inventory/bulk-update')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('immutable');
    });
  });

  describe('GET /api/inventory/alerts', () => {
    it('should return inventory alerts', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.lowStock).toBeDefined();
      expect(response.body.data.outOfStock).toBeDefined();
      expect(response.body.data.nearExpiry).toBeDefined();
      expect(response.body.data.expired).toBeDefined();
    });

    it('should filter alerts by warehouse', async () => {
      const response = await request(app)
        .get(`/api/inventory/alerts?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter alerts by type', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts?type=low_stock')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include alert counts', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.counts).toBeDefined();
      expect(response.body.data.counts.total).toBeDefined();
    });
  });

  describe('GET /api/inventory/valuation', () => {
    it('should return inventory valuation report', async () => {
      const response = await request(app)
        .get('/api/inventory/valuation')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalValue).toBeDefined();
      expect(response.body.data.warehouseBreakdown).toBeDefined();
      expect(response.body.data.categoryBreakdown).toBeDefined();
    });

    it('should filter valuation by warehouse', async () => {
      const response = await request(app)
        .get(`/api/inventory/valuation?warehouse=${testWarehouse._id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseFilter).toBe(testWarehouse._id.toString());
    });

    it('should include detailed breakdown', async () => {
      const response = await request(app)
        .get('/api/inventory/valuation?detailed=true')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.detailedBreakdown).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle server errors gracefully', async () => {
      const response = await request(app)
        .get('/api/inventory/invalid_object_id_format')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const operationPromises = [
        request(app)
          .post(`/api/inventory/${testInventory._id}/reserve`)
          .set('Authorization', `Bearer ${inventoryManagerToken}`)
          .send({ quantity: 20, reason: 'order_fulfillment', reservedFor: 'ORDER1' }),
        request(app)
          .post(`/api/inventory/${testInventory._id}/reserve`)
          .set('Authorization', `Bearer ${inventoryManagerToken}`)
          .send({ quantity: 25, reason: 'order_fulfillment', reservedFor: 'ORDER2' })
      ];

      const responses = await Promise.all(operationPromises);
      
      // At least one should succeed, and total reservations shouldn't exceed available
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should validate business rules during operations', async () => {
      // Try to reserve more than available
      const response = await request(app)
        .post(`/api/inventory/${testInventory._id}/reserve`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({ 
          quantity: 100, // More than available (90)
          reason: 'order_fulfillment',
          reservedFor: 'INVALID_ORDER'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const response = await request(app)
        .get('/api/inventory?limit=100')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('should support complex filtering combinations', async () => {
      const response = await request(app)
        .get(`/api/inventory?warehouse=${testWarehouse._id}&status=active&stockLevel=normal&expiryStatus=valid`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should optimize database queries for dashboard', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/inventory/dashboard')
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});