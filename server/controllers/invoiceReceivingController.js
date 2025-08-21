// server/controllers/invoiceReceivingController.js
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
      products
    } = req.body;
    
    // Validate PO exists and is in correct status
    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    if (!['ordered', 'partial_received'].includes(po.status)) {
      return res.status(400).json({ 
        message: 'Purchase order must be in ordered or partial received status' 
      });
    }
    
    const invoiceReceiving = new InvoiceReceiving({
      purchaseOrder,
      invoiceNumber,
      invoiceDate,
      invoiceAmount,
      dueDate,
      receivedDate,
      receivedBy: req.user._id,
      products,
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
        uploadedBy: req.user._id
      }));
    }
    
    await invoiceReceiving.save();
    
    res.status(201).json({
      message: 'Invoice receiving created successfully',
      invoiceReceiving
    });
  } catch (error) {
    console.error('Create invoice receiving error:', error);
    res.status(500).json({ message: 'Failed to create invoice receiving' });
  }
};

export const submitToQC = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    invoiceReceiving.status = 'submitted';
    invoiceReceiving.qcStatus = 'pending';
    
    await invoiceReceiving.save();
    
    // Update PO workflow
    const po = await PurchaseOrder.findById(invoiceReceiving.purchaseOrder);
    const qcStage = await WorkflowStage.findOne({ code: 'QC_PENDING' });
    
    po.currentStage = qcStage._id;
    po.status = 'qc_pending';
    
    po.workflowHistory.push({
      stage: qcStage._id,
      action: 'submitted_to_qc',
      actionBy: req.user._id,
      remarks: `Invoice ${invoiceReceiving.invoiceNumber} submitted for QC`
    });
    
    await po.save();
    
    res.json({
      message: 'Submitted to QC successfully',
      invoiceReceiving
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
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    invoiceReceiving.qcStatus = qcStatus;
    invoiceReceiving.qcRemarks = qcRemarks;
    invoiceReceiving.qcDate = new Date();
    invoiceReceiving.qcBy = req.user._id;
    
    // Update product-level QC status if provided
    if (productQCResults) {
      productQCResults.forEach(result => {
        const product = invoiceReceiving.products.id(result.productId);
        if (product) {
          product.status = result.status;
          product.remarks = result.remarks;
        }
      });
    }
    
    if (qcStatus === 'passed') {
      invoiceReceiving.status = 'completed';
    }
    
    await invoiceReceiving.save();
    
    // Update PO workflow
    const po = await PurchaseOrder.findById(invoiceReceiving.purchaseOrder);
    let nextStageCode;
    
    if (qcStatus === 'passed') {
      nextStageCode = 'QC_PASSED';
      po.status = 'qc_passed';
    } else if (qcStatus === 'failed') {
      nextStageCode = 'QC_FAILED';
      po.status = 'qc_failed';
    }
    
    const nextStage = await WorkflowStage.findOne({ code: nextStageCode });
    po.currentStage = nextStage._id;
    
    po.workflowHistory.push({
      stage: nextStage._id,
      action: 'qc_completed',
      actionBy: req.user._id,
      remarks: qcRemarks
    });
    
    // If QC passed and all items received, mark as completed
    if (qcStatus === 'passed' && po.isFullyReceived) {
      const completedStage = await WorkflowStage.findOne({ code: 'COMPLETED' });
      po.currentStage = completedStage._id;
      po.status = 'completed';
    }
    
    await po.save();
    
    res.json({
      message: 'QC check completed',
      invoiceReceiving
    });
  } catch (error) {
    console.error('QC check error:', error);
    res.status(500).json({ message: 'Failed to perform QC check' });
  }
};

export const getInvoiceReceivings = async (req, res) => {
  try {
    const { purchaseOrder, status, qcStatus } = req.query;
    
    let query = {};
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (status) query.status = status;
    if (qcStatus) query.qcStatus = qcStatus;
    
    const invoiceReceivings = await InvoiceReceiving.find(query)
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name')
      .populate('qcBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ invoiceReceivings });
  } catch (error) {
    console.error('Get invoice receivings error:', error);
    res.status(500).json({ message: 'Failed to fetch invoice receivings' });
  }
};

export default {
  createInvoiceReceiving,
  submitToQC,
  performQCCheck,
  getInvoiceReceivings
};