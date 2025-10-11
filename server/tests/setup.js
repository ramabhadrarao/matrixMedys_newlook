// tests/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Global test configuration
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
  
  console.log('Test database connected successfully');
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Test database disconnected successfully');
});

// Clear all collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  /**
   * Create a test user with specified role
   */
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    role: 'qc_inspector',
    isActive: true,
    permissions: ['qc:read', 'qc:write'],
    ...overrides
  }),

  /**
   * Create a test product
   */
  createTestProduct: (overrides = {}) => ({
    name: 'Test Product',
    code: 'TEST001',
    category: 'Medical Device',
    description: 'Test product for quality control',
    specifications: {
      weight: '100g',
      dimensions: '10x10x5 cm',
      material: 'Plastic'
    },
    reorderLevel: 50,
    ...overrides
  }),

  /**
   * Create a test warehouse
   */
  createTestWarehouse: (overrides = {}) => ({
    name: 'Test Warehouse',
    code: 'WH001',
    location: 'Test City',
    capacity: 10000,
    contactPerson: 'Warehouse Manager',
    contactEmail: 'warehouse@example.com',
    contactPhone: '+1234567890',
    ...overrides
  }),

  /**
   * Create a test QC record
   */
  createTestQCRecord: (overrides = {}) => ({
    qcType: 'incoming_inspection',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    products: [{
      product: new mongoose.Types.ObjectId(),
      batchNumber: 'BATCH001',
      quantity: 100,
      items: [{
        itemId: 'ITEM001',
        status: 'pending',
        defects: [],
        measurements: {}
      }]
    }],
    testParameters: {
      visualInspection: true,
      dimensionalCheck: true,
      functionalTest: false
    },
    ...overrides
  }),

  /**
   * Create a test warehouse approval record
   */
  createTestWarehouseApproval: (overrides = {}) => ({
    qcRecord: new mongoose.Types.ObjectId(),
    status: 'pending',
    priority: 'medium',
    products: [{
      product: new mongoose.Types.ObjectId(),
      batchNumber: 'BATCH001',
      quantity: 100,
      storageConditions: 'room_temperature',
      storageLocation: {
        zone: 'A',
        aisle: '1',
        rack: '2',
        shelf: '3',
        bin: '4'
      }
    }],
    inventoryCreated: false,
    ...overrides
  }),

  /**
   * Create a test inventory record
   */
  createTestInventory: (overrides = {}) => ({
    product: new mongoose.Types.ObjectId(),
    warehouse: new mongoose.Types.ObjectId(),
    batchNumber: 'BATCH001',
    quantity: 100,
    availableQuantity: 100,
    reservedQuantity: 0,
    unitCost: 10.50,
    totalValue: 1050.00,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    status: 'available',
    storageLocation: {
      zone: 'A',
      aisle: '1',
      rack: '2',
      shelf: '3',
      bin: '4'
    },
    transactions: [],
    ...overrides
  }),

  /**
   * Wait for a specified amount of time (useful for testing async operations)
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random string for testing
   */
  randomString: (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a random email for testing
   */
  randomEmail: () => {
    const username = global.testUtils.randomString(8).toLowerCase();
    return `${username}@test.example.com`;
  },

  /**
   * Generate a random ObjectId
   */
  randomObjectId: () => new mongoose.Types.ObjectId(),

  /**
   * Assert that an object has the expected MongoDB document structure
   */
  expectMongoDocument: (doc) => {
    expect(doc).toHaveProperty('_id');
    expect(doc).toHaveProperty('createdAt');
    expect(doc).toHaveProperty('updatedAt');
    expect(doc._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  },

  /**
   * Assert that an API response has the expected structure
   */
  expectApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    
    if (expectedStatus >= 200 && expectedStatus < 300) {
      expect(response.body.success).toBe(true);
    } else {
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    }
  },

  /**
   * Assert that pagination response has the expected structure
   */
  expectPaginationResponse: (response) => {
    global.testUtils.expectApiResponse(response);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('pages');
  }
};

// Mock console methods to reduce test output noise
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error logs for debugging
  debug: jest.fn()
};

// Restore console after tests if needed
afterAll(() => {
  global.console = originalConsole;
});

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export default {
  mongoServer,
  testUtils: global.testUtils
};