// server/models/InvoiceReceiving.js
import mongoose from 'mongoose';

const receivedProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  productCode: String,
  productName: String,
  orderedQty: { type: Number, default: 0 },
  receivedQty: { type: Number, required: true, default: 0 },
  foc: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  unit: { type: String, default: 'PCS' },
  batchNo: String,
  mfgDate: Date,
  expDate: Date,
  status: {
    type: String,
    enum: ['received', 'backlog', 'damaged', 'rejected'],
    default: 'received'
  },
  remarks: String,
  qcStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'not_required'],
    default: 'pending'
  },
  qcRemarks: String,
  // Product images field (max 10 images)
  productImages: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
});

const documentSchema = new mongoose.Schema({
  name: String,
  type: String, // Document type (Invoice, Delivery Note, etc.)
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const invoiceReceivingSchema = new mongoose.Schema({
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  
  // Invoice Details
  invoiceNumber: {
    type: String,
    required: true
  },
  invoiceDate: Date,
  invoiceAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: Date,
  
  // Receiving Info
  receivedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Products
  products: [receivedProductSchema],
  
  // Documents
  documents: [documentSchema],
  
  // QC Information (Basic - Detailed QC in separate model)
  qcStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'passed', 'failed', 'partial_pass'],
    default: 'pending'
  },
  qcDate: Date,
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcRemarks: String,
  
  // References to detailed workflow models
  qualityControl: { type: mongoose.Schema.Types.ObjectId, ref: 'QualityControl' },
  warehouseApproval: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseApproval' },
  inventoryEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }],
  
  // Workflow Status
  workflowStatus: {
    type: String,
    enum: [
      'received', // Just received, pending QC
      'qc_in_progress', // QC is being performed
      'qc_completed', // QC completed (passed/failed/partial)
      'warehouse_pending', // Waiting for warehouse approval
      'warehouse_in_progress', // Warehouse approval in progress
      'warehouse_completed', // Warehouse approval completed
      'inventory_updated', // Stock added to inventory
      'completed', // Entire workflow completed
      'rejected' // Rejected at any stage
    ],
    default: 'received'
  },
  
  // Overall Status (Legacy - keeping for backward compatibility)
  status: {
    type: String,
    enum: ['draft', 'submitted', 'qc_pending', 'completed', 'rejected'],
    default: 'draft'
  },
  
  // Additional Information
  notes: {
    type: String,
    default: ''
  },
  qcRequired: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Update PO status after receiving
invoiceReceivingSchema.post('save', async function() {
  try {
    console.log(`[${process.pid}] Post-save hook triggered for invoice receiving: ${this.invoiceNumber}`);
    
    const PurchaseOrder = mongoose.model('PurchaseOrder');
    const po = await PurchaseOrder.findById(this.purchaseOrder);
    
    if (!po) {
      console.log(`[${process.pid}] PO not found: ${this.purchaseOrder}`);
      return;
    }
    
    console.log(`[${process.pid}] Found PO: ${po.poNumber}, products count: ${this.products.length}`);
    
    // Update received quantities in PO
    for (const receivedProduct of this.products) {
      console.log(`[${process.pid}] Processing received product: ${receivedProduct.productName}, product ID: ${receivedProduct.product}`);
      
      // Skip products with null product ID
      if (!receivedProduct.product) {
        console.log(`[${process.pid}] Skipping product with null ID: ${receivedProduct.productName}`);
        continue;
      }
      
      const poProduct = po.products.find(p => 
        p.product && p.product.toString() === receivedProduct.product.toString()
      );
      
      if (poProduct) {
        const oldReceivedQty = poProduct.receivedQty || 0;
        poProduct.receivedQty = oldReceivedQty + receivedProduct.receivedQty;
        poProduct.backlogQty = poProduct.quantity - poProduct.receivedQty;
        
        console.log(`[${process.pid}] Updated PO product ${poProduct.productName}: receivedQty=${oldReceivedQty} + ${receivedProduct.receivedQty} = ${poProduct.receivedQty}, backlogQty=${poProduct.backlogQty}`);
      } else {
        console.log(`[${process.pid}] PO product not found for: ${receivedProduct.productName}`);
      }
    }
    
    // Update PO status
    const allReceived = po.products.every(p => p.receivedQty >= p.quantity);
    const someReceived = po.products.some(p => p.receivedQty > 0);
    
    if (allReceived) {
      po.status = 'received';
      po.isFullyReceived = true;
    } else if (someReceived) {
      po.status = 'partial_received';
    }
    
    // Update totals
    po.totalReceivedQty = po.products.reduce((sum, p) => sum + (p.receivedQty || 0), 0);
    po.totalBacklogQty = po.products.reduce((sum, p) => sum + (p.backlogQty || 0), 0);
    
    console.log(`[${process.pid}] Saving PO with new status: ${po.status}`);
    await po.save();
    console.log(`[${process.pid}] PO saved successfully`);
  } catch (error) {
    console.error(`[${process.pid}] Error in post-save hook:`, error);
  }
});

export default mongoose.model('InvoiceReceiving', invoiceReceivingSchema);