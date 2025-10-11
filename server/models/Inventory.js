// server/models/Inventory.js
import mongoose from 'mongoose';

// Product History Schema - Complete traceability from PO to patient
const productHistorySchema = new mongoose.Schema({
  // Purchase Order Details
  purchaseOrder: {
    poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    poNumber: String,
    poDate: Date,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Principal' },
    supplierName: String
  },
  
  // Invoice Receiving Details
  invoiceReceiving: {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceReceiving' },
    invoiceNumber: String,
    invoiceDate: Date,
    receivedDate: Date,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedQty: Number
  },
  
  // Quality Control Details
  qualityControl: {
    qcId: { type: mongoose.Schema.Types.ObjectId, ref: 'QualityControl' },
    qcNumber: String,
    qcDate: Date,
    qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qcStatus: String,
    qcPassedQty: Number,
    qcFailedQty: Number,
    qcRemarks: String
  },
  
  // Warehouse Approval Details
  warehouseApproval: {
    warehouseApprovalId: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseApproval' },
    warehouseApprovalNumber: String,
    warehouseApprovalDate: Date,
    warehouseApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    warehouseApprovedQty: Number,
    storageLocation: {
      zone: String,
      rack: String,
      shelf: String,
      bin: String
    }
  },
  
  // Utilization Details (Hospital, Case, Patient)
  utilization: [{
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalName: String,
    case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' }, // If case management exists
    caseNumber: String,
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, // If patient management exists
    patientName: String,
    patientId: String,
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    doctorName: String,
    utilizationDate: Date,
    utilizationQty: Number,
    utilizationReason: String,
    utilizationBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    utilizationRemarks: String
  }]
});

// Stock Movement Schema - Track all stock movements
const stockMovementSchema = new mongoose.Schema({
  movementType: {
    type: String,
    enum: [
      'inward', // Stock coming in (from warehouse approval)
      'outward', // Stock going out (to hospital/patient)
      'transfer', // Stock transfer between locations
      'adjustment', // Stock adjustment (positive/negative)
      'return', // Stock return from hospital
      'expired', // Stock marked as expired
      'damaged', // Stock marked as damaged
      'lost' // Stock marked as lost
    ],
    required: true
  },
  quantity: { type: Number, required: true },
  fromLocation: {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    zone: String,
    rack: String,
    shelf: String,
    bin: String
  },
  toLocation: {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    zone: String,
    rack: String,
    shelf: String,
    bin: String
  },
  reason: String,
  remarks: String,
  movementDate: { type: Date, default: Date.now },
  movementBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Reference documents
  referenceType: {
    type: String,
    enum: ['warehouse_approval', 'hospital_requisition', 'transfer_order', 'adjustment_note', 'return_note']
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String
});

// Main Inventory Schema
const inventorySchema = new mongoose.Schema({
  // Product Information
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productCode: String,
  productName: String,
  
  // Batch Information
  batchNo: { type: String, required: true },
  mfgDate: Date,
  expDate: Date,
  
  // Warehouse and Location
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  location: {
    zone: String,
    rack: String,
    shelf: String,
    bin: String
  },
  
  // Stock Quantities
  currentStock: { type: Number, required: true, default: 0 },
  reservedStock: { type: Number, default: 0 }, // Stock reserved for orders
  availableStock: { type: Number, default: 0 }, // currentStock - reservedStock
  minimumStock: { type: Number, default: 0 }, // Reorder level
  maximumStock: { type: Number, default: 0 }, // Maximum stock level
  
  // Stock Status
  stockStatus: {
    type: String,
    enum: ['active', 'expired', 'near_expiry', 'damaged', 'quarantine', 'blocked'],
    default: 'active'
  },
  
  // Pricing Information (from latest purchase)
  unitCost: { type: Number, required: true },
  totalValue: { type: Number, required: true }, // currentStock * unitCost
  
  // Storage Conditions
  storageConditions: {
    temperature: { min: Number, max: Number, unit: { type: String, default: '°C' } },
    humidity: { min: Number, max: Number, unit: { type: String, default: '%' } },
    lightCondition: { type: String, enum: ['dark', 'normal', 'protected'], default: 'normal' },
    specialRequirements: String
  },
  
  // Complete Product History (Traceability)
  productHistory: productHistorySchema,
  
  // Stock Movements
  stockMovements: [stockMovementSchema],
  
  // Alerts and Notifications
  alerts: [{
    alertType: {
      type: String,
      enum: ['low_stock', 'near_expiry', 'expired', 'overstock', 'no_movement', 'temperature_breach']
    },
    message: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date
  }],
  
  // Quality Information
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'D'], // A = Excellent, B = Good, C = Fair, D = Poor
    default: 'A'
  },
  qualityRemarks: String,
  
  // Compliance and Regulatory
  regulatoryInfo: {
    drugLicense: String,
    batchCertificate: String,
    coa: String, // Certificate of Analysis
    msds: String, // Material Safety Data Sheet
    regulatoryApproval: String
  },
  
  // Financial Information
  financialInfo: {
    purchaseValue: Number,
    currentValue: Number,
    depreciationRate: Number,
    insuranceValue: Number,
    taxInfo: {
      gstRate: Number,
      hsnCode: String
    }
  },
  
  // Cycle Count Information
  cycleCount: {
    lastCountDate: Date,
    lastCountBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastCountQty: Number,
    variance: Number, // Difference between system and physical count
    nextCountDue: Date
  },
  
  // Reservation Information
  reservations: [{
    reservedFor: {
      type: String,
      enum: ['hospital_order', 'transfer_order', 'maintenance', 'quality_check']
    },
    reservedQty: Number,
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reservedDate: { type: Date, default: Date.now },
    expiryDate: Date,
    referenceId: mongoose.Schema.Types.ObjectId,
    referenceNumber: String,
    status: { type: String, enum: ['active', 'fulfilled', 'cancelled'], default: 'active' }
  }],
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Soft delete
  isActive: { type: Boolean, default: true },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Indexes for performance
inventorySchema.index({ product: 1, batchNo: 1, warehouse: 1 }, { unique: true });
inventorySchema.index({ warehouse: 1, stockStatus: 1 });
inventorySchema.index({ expDate: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ 'location.zone': 1, 'location.rack': 1 });
inventorySchema.index({ createdAt: -1 });

// Virtual for days until expiry
inventorySchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expDate) return null;
  const today = new Date();
  const expiry = new Date(this.expDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for stock value
inventorySchema.virtual('stockValue').get(function() {
  return this.currentStock * this.unitCost;
});

// Virtual for expiry status
inventorySchema.virtual('expiryStatus').get(function() {
  const daysUntilExpiry = this.daysUntilExpiry;
  if (daysUntilExpiry === null) return 'no_expiry';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'near_expiry';
  if (daysUntilExpiry <= 90) return 'expiring_soon';
  return 'good';
});

// Update available stock when current or reserved stock changes
inventorySchema.pre('save', function(next) {
  this.availableStock = this.currentStock - this.reservedStock;
  this.totalValue = this.currentStock * this.unitCost;
  next();
});

// Methods for stock operations
inventorySchema.methods.addStock = function(quantity, movementData) {
  this.currentStock += quantity;
  this.stockMovements.push({
    ...movementData,
    movementType: 'inward',
    quantity: quantity
  });
  return this.save();
};

inventorySchema.methods.removeStock = function(quantity, movementData) {
  if (this.availableStock < quantity) {
    throw new Error('Insufficient stock available');
  }
  this.currentStock -= quantity;
  this.stockMovements.push({
    ...movementData,
    movementType: 'outward',
    quantity: quantity
  });
  return this.save();
};

inventorySchema.methods.reserveStock = function(quantity, reservationData) {
  if (this.availableStock < quantity) {
    throw new Error('Insufficient stock available for reservation');
  }
  this.reservedStock += quantity;
  this.reservations.push({
    ...reservationData,
    reservedQty: quantity
  });
  return this.save();
};

inventorySchema.methods.releaseReservation = function(reservationId) {
  const reservation = this.reservations.id(reservationId);
  if (reservation && reservation.status === 'active') {
    this.reservedStock -= reservation.reservedQty;
    reservation.status = 'cancelled';
  }
  return this.save();
};

// Method to check if stock needs reordering
inventorySchema.methods.needsReorder = function() {
  return this.availableStock <= this.minimumStock;
};

// Method to get complete product journey
inventorySchema.methods.getProductJourney = function() {
  return {
    purchaseOrder: this.productHistory.purchaseOrder,
    invoiceReceiving: this.productHistory.invoiceReceiving,
    qualityControl: this.productHistory.qualityControl,
    warehouseApproval: this.productHistory.warehouseApproval,
    currentLocation: this.location,
    utilization: this.productHistory.utilization,
    stockMovements: this.stockMovements
  };
};

// Set virtuals to be included in JSON
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

export default mongoose.model('Inventory', inventorySchema);