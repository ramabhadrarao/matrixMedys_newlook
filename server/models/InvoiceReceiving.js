// server/models/InvoiceReceiving.js
import mongoose from 'mongoose';

const receivedProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productCode: String,
  productName: String,
  orderedQty: Number,
  receivedQty: { type: Number, required: true },
  foc: { type: Number, default: 0 },
  unitPrice: Number,
  batchNo: String,
  mfgDate: Date,
  expDate: Date,
  status: {
    type: String,
    enum: ['received', 'backlog', 'damaged', 'rejected'],
    default: 'received'
  },
  remarks: String
});

const documentSchema = new mongoose.Schema({
  name: String,
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
  
  // QC Status
  qcStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'passed', 'failed', 'partial_pass'],
    default: 'pending'
  },
  qcDate: Date,
  qcBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qcRemarks: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'qc_pending', 'completed', 'rejected'],
    default: 'draft'
  },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { timestamps: true });

// Update PO status after receiving
invoiceReceivingSchema.post('save', async function() {
  const PurchaseOrder = mongoose.model('PurchaseOrder');
  const po = await PurchaseOrder.findById(this.purchaseOrder);
  
  if (po) {
    // Update received quantities in PO
    for (const receivedProduct of this.products) {
      const poProduct = po.products.find(p => 
        p.product.toString() === receivedProduct.product.toString()
      );
      
      if (poProduct) {
        poProduct.receivedQty = (poProduct.receivedQty || 0) + receivedProduct.receivedQty;
        poProduct.backlogQty = poProduct.quantity - poProduct.receivedQty;
        
        // Add to receiving history
        poProduct.receivingHistory.push({
          receivedQty: receivedProduct.receivedQty,
          receivedDate: this.receivedDate,
          receivedBy: this.receivedBy,
          invoiceNumber: this.invoiceNumber,
          batchNo: receivedProduct.batchNo,
          mfgDate: receivedProduct.mfgDate,
          expDate: receivedProduct.expDate,
          remarks: receivedProduct.remarks
        });
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
    
    await po.save();
  }
});

export default mongoose.model('InvoiceReceiving', invoiceReceivingSchema);