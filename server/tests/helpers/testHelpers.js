// tests/helpers/testHelpers.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import Permission from '../../models/Permission.js';
import Role from '../../models/Role.js';
import QualityControl from '../../models/QualityControl.js';
import WarehouseApproval from '../../models/WarehouseApproval.js';
import InvoiceReceiving from '../../models/InvoiceReceiving.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import Product from '../../models/Product.js';
import Principal from '../../models/Principal.js';
import Warehouse from '../../models/Warehouse.js';

// Create test user with specific permissions
export const createTestUser = async (permissions = [], roles = ['user']) => {
  const hashedPassword = await bcrypt.hash('testpassword123', 12);
  
  const user = new User({
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: hashedPassword,
    roles,
    permissions,
    isActive: true
  });
  
  await user.save();
  return user;
};

// Create test admin user
export const createTestAdmin = async () => {
  const hashedPassword = await bcrypt.hash('adminpassword123', 12);
  
  const user = new User({
    name: 'Test Admin',
    email: `admin${Date.now()}@example.com`,
    password: hashedPassword,
    roles: ['admin'],
    permissions: ['*'],
    isActive: true
  });
  
  await user.save();
  return user;
};

// Generate JWT token for test user
export const generateTestToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Create test principal
export const createTestPrincipal = async () => {
  const principal = new Principal({
    name: 'Test Principal Ltd',
    email: 'principal@test.com',
    phone: '9876543210',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India'
    },
    gstNumber: '29ABCDE1234F1Z5',
    panNumber: 'ABCDE1234F',
    isActive: true
  });
  
  await principal.save();
  return principal;
};

// Create test warehouse
export const createTestWarehouse = async () => {
  const warehouse = new Warehouse({
    name: 'Test Warehouse',
    code: 'TW001',
    location: 'Test Location',
    address: {
      street: '456 Warehouse Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India'
    },
    capacity: 1000,
    currentStock: 0,
    isActive: true
  });
  
  await warehouse.save();
  return warehouse;
};

// Create test product
export const createTestProduct = async () => {
  const product = new Product({
    name: 'Test Product',
    code: 'TP001',
    specification: 'Test product specification',
    hsnCode: '30049099',
    barcode: '1234567890123',
    batchNo: 'BATCH001',
    mfgDate: new Date('2024-01-15'),
    expDate: new Date('2026-01-15'),
    mrp: 100.00,
    dealerPrice: 80.00,
    gstPercentage: 12,
    defaultDiscount: 5,
    unit: 'pieces',
    isActive: true
  });
  
  await product.save();
  return product;
};

// Create test purchase order
export const createTestPurchaseOrder = async (principal, products = []) => {
  if (products.length === 0) {
    products = [await createTestProduct()];
  }
  
  const po = new PurchaseOrder({
    poNumber: `MM-TEST-${Date.now()}`,
    principal: principal._id,
    poDate: new Date(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    products: products.map(product => ({
      product: product._id,
      quantity: 100,
      unitPrice: product.dealerPrice,
      discount: 0,
      gstPercentage: product.gstPercentage,
      totalAmount: 100 * product.dealerPrice
    })),
    totalAmount: products.reduce((sum, product) => sum + (100 * product.dealerPrice), 0),
    status: 'ordered',
    createdBy: null // Will be set by test
  });
  
  await po.save();
  return po;
};

// Create test invoice receiving
export const createTestInvoiceReceiving = async (purchaseOrder, warehouse, user) => {
  const invoiceReceiving = new InvoiceReceiving({
    invoiceNumber: `INV-${Date.now()}`,
    purchaseOrder: purchaseOrder._id,
    warehouse: warehouse._id,
    receivedDate: new Date(),
    receivedBy: user._id,
    products: purchaseOrder.products.map(product => ({
      product: product.product,
      orderedQty: product.quantity,
      receivedQty: product.quantity,
      unit: 'pieces',
      batchNumber: 'BATCH001',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      remarks: 'Test product received'
    })),
    workflowStatus: 'qc_pending',
    qcStatus: 'pending',
    warehouseStatus: 'pending',
    inventoryStatus: 'pending'
  });
  
  await invoiceReceiving.save();
  return invoiceReceiving;
};

// Create test QC record
export const createTestQCRecord = async (invoiceReceiving, user) => {
  const qc = new QualityControl({
    invoiceReceiving: invoiceReceiving._id,
    qcType: 'incoming_inspection',
    status: 'pending',
    overallResult: 'pending',
    assignedTo: user._id,
    products: invoiceReceiving.products.map(product => ({
      productId: product.product,
      receivedQty: product.receivedQty,
      unit: product.unit,
      batchNumber: product.batchNumber,
      expiryDate: product.expiryDate,
      qcResult: 'pending',
      itemDetails: [{
        itemId: `item-${Date.now()}`,
        status: 'pending',
        reason: ''
      }],
      qcSummary: {
        totalItems: 1,
        passedItems: 0,
        failedItems: 0,
        pendingItems: 1
      }
    }))
  });
  
  await qc.save();
  return qc;
};

// Create test warehouse approval
export const createTestWarehouseApproval = async (qcRecord, warehouse, user) => {
  const warehouseApproval = new WarehouseApproval({
    qualityControl: qcRecord._id,
    invoiceReceiving: qcRecord.invoiceReceiving,
    warehouse: warehouse._id,
    approvalNumber: `WA-${Date.now()}`,
    status: 'pending',
    overallResult: 'pending',
    assignedTo: user._id,
    products: qcRecord.products.map(product => ({
      productId: product.productId,
      receivedQty: product.receivedQty,
      approvedQty: 0,
      rejectedQty: 0,
      unit: product.unit,
      batchNumber: product.batchNumber,
      expiryDate: product.expiryDate,
      status: 'pending',
      storageLocation: 'A-01-01',
      storageConditions: 'Room Temperature'
    }))
  });
  
  await warehouseApproval.save();
  return warehouseApproval;
};

// Mock request object
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: null,
  headers: {},
  ...overrides
});

// Mock response object
export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
export const mockNext = jest.fn();

// Clean up test data
export const cleanupTestData = async () => {
  await Promise.all([
    User.deleteMany({}),
    Permission.deleteMany({}),
    Role.deleteMany({}),
    QualityControl.deleteMany({}),
    WarehouseApproval.deleteMany({}),
    InvoiceReceiving.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Product.deleteMany({}),
    Principal.deleteMany({}),
    Warehouse.deleteMany({})
  ]);
};