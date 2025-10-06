// server/controllers/invoiceReceivingController.js - FIXED VERSION
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';

export const createInvoiceReceiving = async (req, res) => {
  try {
    const {
      purchaseOrder,
      invoiceNumber,
      invoiceDate,
      invoiceAmount,
      dueDate,
      receivedDate,
      receivedProducts,
      products, // Also check for products field
      notes,
      qcRequired = true
    } = req.body;
    
    console.log('Creating invoice receiving with data:', req.body);
    console.log('receivedProducts:', receivedProducts);
    console.log('products:', products);
    
    // Validate PO exists and is in correct status
    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    if (!['ordered', 'partial_received'].includes(po.status)) {
      return res.status(400).json({ 
        message: 'Purchase order must be in ordered or partial_received status' 
      });
    }
    
    // Parse products data - check both receivedProducts and products fields
    let productsArray = products || receivedProducts;
    if (typeof productsArray === 'string') {
      try {
        productsArray = JSON.parse(productsArray);
      } catch (e) {
        console.error('Error parsing products data:', e);
        return res.status(400).json({ message: 'Invalid products data format' });
      }
    }
    
    console.log('Parsed productsArray:', productsArray);
    
    // Validate received products - allow zero quantities but require products array
    if (!productsArray || !Array.isArray(productsArray)) {
      return res.status(400).json({ message: 'Products data is required' });
    }
    
    if (productsArray.length === 0) {
      return res.status(400).json({ message: 'Product list cannot be empty (even with zero received quantities)' });
    }
    
    // Log zero received quantities for business tracking
    const zeroReceivedProducts = productsArray.filter(p => (p.receivedQuantity || 0) === 0);
    if (zeroReceivedProducts.length > 0) {
      console.log(`Invoice receiving with ${zeroReceivedProducts.length} zero-received products:`, 
        zeroReceivedProducts.map(p => p.productName || p.productCode).join(', '));
    }
    
    const invoiceReceiving = new InvoiceReceiving({
      purchaseOrder,
      invoiceNumber,
      invoiceDate,
      invoiceAmount,
      dueDate,
      receivedDate: receivedDate || new Date(),
      receivedBy: req.user._id,
      products: productsArray.map(product => ({
        product: product.product,
        productCode: product.productCode || '',
        productName: product.productName || '',
        orderedQty: product.orderedQuantity || product.orderedQty || 0,
        receivedQty: product.receivedQuantity || product.receivedQty || 0,
        foc: product.foc || 0,
        unitPrice: product.unitPrice || 0,
        unit: product.unit || 'PCS',
        batchNo: product.batchNumber || product.batchNo || '',
        mfgDate: product.manufacturingDate || product.mfgDate || '',
        expDate: product.expiryDate || product.expDate || '',
        status: product.status || 'received',
        remarks: product.remarks || '',
        qcStatus: qcRequired ? 'pending' : 'not_required',
        qcRemarks: ''
      })),
      documents: [],
      notes: notes || '',
      qcRequired,
      status: 'draft',
      createdBy: req.user._id
    });
    
    // Handle file uploads if any
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      invoiceReceiving.documents = documentFiles.map(file => ({
        name: file.originalname,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      }));
    }
    
    await invoiceReceiving.save();
    await invoiceReceiving.populate([
      { path: 'purchaseOrder', select: 'poNumber status' },
      { path: 'receivedBy', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    // Update PO with received quantities
    await updatePOReceivedQuantities(po._id);
    
    console.log('Invoice receiving created successfully:', invoiceReceiving._id);
    
    res.status(201).json({
      message: 'Invoice receiving created successfully',
      data: invoiceReceiving
    });
  } catch (error) {
    console.error('Create invoice receiving error:', error);
    res.status(500).json({ 
      message: 'Failed to create invoice receiving',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const getInvoiceReceiving = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id)
      .populate('purchaseOrder', 'poNumber status supplier')
      .populate('receivedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('qcBy', 'name email');
    
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    res.json({ data: invoiceReceiving });
  } catch (error) {
    console.error('Get invoice receiving error:', error);
    res.status(500).json({ message: 'Failed to fetch invoice receiving' });
  }
};

export const getInvoiceReceivings = async (req, res) => {
  try {
    const { 
      purchaseOrder, 
      status, 
      qcStatus, 
      page = 1, 
      limit = 10,
      search,
      dateFrom,
      dateTo
    } = req.query;
    
    let query = {};
    
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (status) query.status = status;
    if (qcStatus) query.qcStatus = qcStatus;
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'purchaseOrder.poNumber': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) query.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) query.receivedDate.$lte = new Date(dateTo);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const invoiceReceivings = await InvoiceReceiving.find(query)
      .populate('purchaseOrder', 'poNumber status supplier')
      .populate('receivedBy', 'name email')
      .populate('qcBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalCount = await InvoiceReceiving.countDocuments(query);
    
    res.json({ 
      data: {
        invoiceReceivings,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get invoice receivings error:', error);
    res.status(500).json({ message: 'Failed to fetch invoice receivings' });
  }
};

export const updateInvoiceReceiving = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    // Only allow updates in draft or submitted status
    if (!['draft', 'submitted'].includes(invoiceReceiving.status)) {
      return res.status(400).json({ 
        message: 'Cannot update invoice receiving in current status' 
      });
    }
    
    // Parse receivedProducts if it's a string (from FormData)
    if (updates.receivedProducts && typeof updates.receivedProducts === 'string') {
      try {
        updates.receivedProducts = JSON.parse(updates.receivedProducts);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid products data format' });
      }
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && updates[key] !== undefined) {
        invoiceReceiving[key] = updates[key];
      }
    });
    
    invoiceReceiving.updatedBy = req.user._id;
    
    await invoiceReceiving.save();
    await invoiceReceiving.populate([
      { path: 'purchaseOrder', select: 'poNumber status' },
      { path: 'receivedBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);
    
    // Update PO received quantities
    await updatePOReceivedQuantities(invoiceReceiving.purchaseOrder._id);
    
    res.json({
      message: 'Invoice receiving updated successfully',
      data: invoiceReceiving
    });
  } catch (error) {
    console.error('Update invoice receiving error:', error);
    res.status(500).json({ message: 'Failed to update invoice receiving' });
  }
};

export const submitToQC = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    if (invoiceReceiving.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Can only submit draft invoice receivings to QC' 
      });
    }
    
    invoiceReceiving.status = 'submitted';
    if (invoiceReceiving.qcRequired) {
      invoiceReceiving.qcStatus = 'pending';
    }
    
    await invoiceReceiving.save();
    
    // Update PO status to QC pending if QC is required
    if (invoiceReceiving.qcRequired) {
      const po = await PurchaseOrder.findById(invoiceReceiving.purchaseOrder);
      if (po) {
        const qcStage = await WorkflowStage.findOne({ code: 'QC_PENDING' });
        if (qcStage) {
          po.currentStage = qcStage._id;
          po.status = 'qc_pending';
          
          po.workflowHistory.push({
            stage: qcStage._id,
            action: 'submitted_to_qc',
            actionBy: req.user._id,
            remarks: `Invoice ${invoiceReceiving.invoiceNumber} submitted for QC`
          });
          
          await po.save();
        }
      }
    }
    
    await invoiceReceiving.populate([
      { path: 'purchaseOrder', select: 'poNumber status' },
      { path: 'receivedBy', select: 'name email' }
    ]);
    
    res.json({
      message: 'Successfully submitted to QC',
      data: invoiceReceiving
    });
  } catch (error) {
    console.error('Submit to QC error:', error);
    res.status(500).json({ message: 'Failed to submit to QC' });
  }
};

export const performQCCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcStatus, qcRemarks, productQCResults } = req.body;
    
    if (!['passed', 'failed', 'partial'].includes(qcStatus)) {
      return res.status(400).json({ message: 'Invalid QC status' });
    }
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    invoiceReceiving.qcStatus = qcStatus;
    invoiceReceiving.qcRemarks = qcRemarks;
    invoiceReceiving.qcDate = new Date();
    invoiceReceiving.qcBy = req.user._id;
    
    // Update product-level QC status if provided
    if (productQCResults && Array.isArray(productQCResults)) {
      productQCResults.forEach(result => {
        const product = invoiceReceiving.receivedProducts.find(p => 
          p.product.toString() === result.productId || 
          p._id.toString() === result.productId
        );
        if (product) {
          product.qcStatus = result.status || qcStatus;
          product.qcRemarks = result.remarks || '';
        }
      });
    } else {
      // Apply QC status to all products
      invoiceReceiving.receivedProducts.forEach(product => {
        product.qcStatus = qcStatus;
        product.qcRemarks = qcRemarks;
      });
    }
    
    if (qcStatus === 'passed') {
      invoiceReceiving.status = 'completed';
    } else if (qcStatus === 'failed') {
      invoiceReceiving.status = 'rejected';
    }
    
    await invoiceReceiving.save();
    
    // Update PO workflow
    const po = await PurchaseOrder.findById(invoiceReceiving.purchaseOrder);
    if (po) {
      let nextStageCode;
      
      if (qcStatus === 'passed') {
        nextStageCode = 'QC_PASSED';
        po.status = 'qc_passed';
      } else if (qcStatus === 'failed') {
        nextStageCode = 'QC_FAILED';
        po.status = 'qc_failed';
      } else if (qcStatus === 'partial') {
        nextStageCode = 'QC_PENDING';
        po.status = 'qc_pending';
      }
      
      const nextStage = await WorkflowStage.findOne({ code: nextStageCode });
      if (nextStage) {
        po.currentStage = nextStage._id;
        
        po.workflowHistory.push({
          stage: nextStage._id,
          action: 'qc_completed',
          actionBy: req.user._id,
          remarks: qcRemarks || `QC ${qcStatus} for invoice ${invoiceReceiving.invoiceNumber}`
        });
        
        // Check if all items are fully received and QC passed
        if (qcStatus === 'passed' && po.isFullyReceived) {
          const completedStage = await WorkflowStage.findOne({ code: 'COMPLETED' });
          if (completedStage) {
            po.currentStage = completedStage._id;
            po.status = 'completed';
          }
        }
        
        await po.save();
      }
    }
    
    await invoiceReceiving.populate([
      { path: 'purchaseOrder', select: 'poNumber status' },
      { path: 'qcBy', select: 'name email' }
    ]);
    
    res.json({
      message: 'QC check completed successfully',
      data: invoiceReceiving
    });
  } catch (error) {
    console.error('QC check error:', error);
    res.status(500).json({ message: 'Failed to perform QC check' });
  }
};

// Helper function to update PO received quantities
const updatePOReceivedQuantities = async (purchaseOrderId) => {
  try {
    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) return;
    
    // Get all invoice receivings for this PO
    const invoiceReceivings = await InvoiceReceiving.find({ 
      purchaseOrder: purchaseOrderId,
      status: { $in: ['submitted', 'completed'] }
    });
    
    // Calculate total received quantities per product
    const receivedQuantities = {};
    
    invoiceReceivings.forEach(receiving => {
      receiving.receivedProducts.forEach(product => {
        const productId = product.product.toString();
        if (!receivedQuantities[productId]) {
          receivedQuantities[productId] = 0;
        }
        receivedQuantities[productId] += product.receivedQuantity || 0;
      });
    });
    
    // Update PO products with received quantities
    let allFullyReceived = true;
    
    po.products.forEach(product => {
      const productId = product.product.toString();
      const receivedQty = receivedQuantities[productId] || 0;
      
      product.receivedQty = receivedQty;
      product.backlogQty = Math.max(0, product.quantity - receivedQty);
      
      if (product.backlogQty > 0) {
        allFullyReceived = false;
      }
    });
    
    // Update PO status based on received quantities
    const totalReceived = Object.values(receivedQuantities).reduce((sum, qty) => sum + qty, 0);
    
    if (totalReceived === 0) {
      po.status = 'ordered';
    } else if (allFullyReceived) {
      po.status = 'received';
      // Find and set appropriate workflow stage
      const receivedStage = await WorkflowStage.findOne({ code: 'RECEIVED' });
      if (receivedStage) {
        po.currentStage = receivedStage._id;
      }
    } else {
      po.status = 'partial_received';
      const partialReceivedStage = await WorkflowStage.findOne({ code: 'PARTIAL_RECEIVED' });
      if (partialReceivedStage) {
        po.currentStage = partialReceivedStage._id;
      }
    }
    
    po.isFullyReceived = allFullyReceived;
    po.updatedAt = new Date();
    
    await po.save();
    
    console.log(`Updated PO ${po.poNumber} - Status: ${po.status}, Fully Received: ${allFullyReceived}`);
  } catch (error) {
    console.error('Error updating PO received quantities:', error);
  }
};

export const updateQCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIndex, qcStatus, qcRemarks, qcBy, qcDate } = req.body;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    if (productIndex >= 0 && productIndex < invoiceReceiving.receivedProducts.length) {
      const product = invoiceReceiving.receivedProducts[productIndex];
      product.qcStatus = qcStatus;
      product.qcRemarks = qcRemarks;
      product.qcBy = qcBy;
      product.qcDate = qcDate;
      
      await invoiceReceiving.save();
      
      res.json({
        message: 'Product QC status updated successfully',
        data: invoiceReceiving
      });
    } else {
      res.status(400).json({ message: 'Invalid product index' });
    }
  } catch (error) {
    console.error('Update QC status error:', error);
    res.status(500).json({ message: 'Failed to update QC status' });
  }
};

export default {
  createInvoiceReceiving,
  getInvoiceReceiving,
  getInvoiceReceivings,
  updateInvoiceReceiving,
  submitToQC,
  performQCCheck,
  updateQCStatus
};