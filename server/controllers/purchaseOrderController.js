// server/controllers/purchaseOrderController.js
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';
import Principal from '../models/Principal.js';
import Product from '../models/Product.js';
import { sendPOEmail } from '../services/emailService.js';

// Get all POs with filtering
export const getPurchaseOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      principal, 
      fromDate, 
      toDate,
      search 
    } = req.query;
    
    console.log('Get POs request params:', req.query);
    
    let query = {};
    
    if (status) query.status = status;
    if (principal) query.principal = principal;
    
    if (fromDate || toDate) {
      query.poDate = {};
      if (fromDate) query.poDate.$gte = new Date(fromDate);
      if (toDate) query.poDate.$lte = new Date(toDate);
    }
    
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { 'billTo.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Query:', query);
    console.log('Skip:', skip, 'Limit:', parseInt(limit));
    
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('principal', 'name gstNumber email')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('currentStage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await PurchaseOrder.countDocuments(query);
    
    console.log(`Found ${purchaseOrders.length} POs out of ${total} total`);
    
    // Ensure products have default values
    const processedPOs = purchaseOrders.map(po => {
      const poObj = po.toObject();
      // Ensure products array exists
      if (!poObj.products) {
        poObj.products = [];
      }
      // Ensure grandTotal exists
      if (!poObj.grandTotal && poObj.grandTotal !== 0) {
        poObj.grandTotal = 0;
      }
      return poObj;
    });
    
    const response = {
      purchaseOrders: processedPOs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
    
    console.log('Sending response with', response.purchaseOrders.length, 'POs');
    res.json(response);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch purchase orders',
      error: error.message 
    });
  }
};

// Get single PO
export const getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('principal')
      .populate('products.product')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('currentStage')
      .populate('workflowHistory.stage')
      .populate('workflowHistory.actionBy', 'name email');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    res.json({ purchaseOrder });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order' });
  }
};

// Create PO
// Add this to server/controllers/purchaseOrderController.js
// Replace the createPurchaseOrder function (starting around line 59)

export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      poNumber,
      poDate,
      principal,
      billTo,
      shipTo,
      products,
      additionalDiscount,
      taxType,
      gstRate,
      shippingCharges,
      toEmails,
      fromEmail,
      ccEmails,
      terms,
      notes
    } = req.body;
    
    // Validate required fields
    if (!principal) {
      return res.status(400).json({ message: 'Principal is required' });
    }
    
    if (!billTo || !billTo.branchWarehouse) {
      return res.status(400).json({ message: 'Billing information is required' });
    }
    
    if (!shipTo || !shipTo.branchWarehouse) {
      return res.status(400).json({ message: 'Shipping information is required' });
    }
    
    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'At least one product is required' });
    }
    
    // Get or generate PO number
    let finalPoNumber = poNumber;
    if (!finalPoNumber) {
      // Generate PO number if not provided
      const principalDoc = await Principal.findById(principal);
      if (!principalDoc) {
        return res.status(404).json({ message: 'Principal not found' });
      }
      
      const principalCode = principalDoc.name.substring(0, 3).toUpperCase();
      const date = new Date();
      const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().substr(-2)}`;
      
      // Get count of POs for today to generate serial number
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const poCount = await PurchaseOrder.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });
      
      const serialNo = (poCount + 1).toString().padStart(3, '0');
      finalPoNumber = `MM-${principalCode}-${dateStr}/${serialNo}`;
    }
    
    // Get initial workflow stage
    let draftStage = await WorkflowStage.findOne({ code: 'DRAFT' });
    
    // If no DRAFT stage exists, create a default one
    if (!draftStage) {
      draftStage = new WorkflowStage({
        name: 'Draft',
        code: 'DRAFT',
        description: 'Initial draft stage',
        sequence: 1,
        allowedActions: ['edit', 'approve', 'cancel'],
        isActive: true
      });
      await draftStage.save();
    }
    
    // Process products to ensure all required fields
    const processedProducts = products.map(product => ({
      product: product.product,
      productCode: product.productCode || '',
      productName: product.productName || '',
      description: product.description || '',
      quantity: Number(product.quantity) || 1,
      unitPrice: Number(product.unitPrice) || 0,
      foc: Number(product.foc) || 0,
      discount: Number(product.discount) || 0,
      discountType: product.discountType || 'amount',
      unit: product.unit || 'PCS',
      gstRate: Number(product.gstRate) || 18,
      remarks: product.remarks || ''
    }));
    
    const purchaseOrder = new PurchaseOrder({
      poNumber: finalPoNumber,
      poDate: poDate || new Date(),
      principal,
      billTo,
      shipTo,
      products: processedProducts,
      additionalDiscount: additionalDiscount || { type: 'amount', value: 0 },
      taxType: taxType || 'IGST',
      gstRate: Number(gstRate) || 5,
      shippingCharges: shippingCharges || { type: 'amount', value: 0 },
      toEmails: toEmails || [],
      fromEmail: fromEmail || req.user.email,
      ccEmails: ccEmails || [],
      terms: terms || '',
      notes: notes || '',
      currentStage: draftStage._id,
      status: 'draft',
      createdBy: req.user._id
    });
    
    // Calculate totals
    purchaseOrder.calculateTotals();
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: draftStage._id,
      action: 'created',
      actionBy: req.user._id,
      actionDate: new Date(),
      remarks: 'Purchase order created'
    });
    
    await purchaseOrder.save();
    
    // Populate references for response
    await purchaseOrder.populate('principal', 'name gstNumber email mobile');
    await purchaseOrder.populate('currentStage');
    await purchaseOrder.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ 
      message: 'Failed to create purchase order',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update PO
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    // Check if user can edit in current stage
    const currentStage = await WorkflowStage.findById(purchaseOrder.currentStage);
    if (!currentStage.allowedActions.includes('edit')) {
      return res.status(403).json({ 
        message: 'Cannot edit purchase order in current stage' 
      });
    }
    
    // Track changes for workflow history
    const changes = {};
    Object.keys(updates).forEach(key => {
      if (purchaseOrder[key] !== updates[key]) {
        changes[key] = {
          old: purchaseOrder[key],
          new: updates[key]
        };
      }
    });
    
    // Update fields
    Object.assign(purchaseOrder, updates);
    purchaseOrder.updatedBy = req.user._id;
    
    // Recalculate totals if products changed
    if (updates.products) {
      purchaseOrder.calculateTotals();
    }
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: purchaseOrder.currentStage,
      action: 'updated',
      actionBy: req.user._id,
      remarks: 'Purchase order updated',
      changes
    });
    
    await purchaseOrder.save();
    
    res.json({
      message: 'Purchase order updated successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ message: 'Failed to update purchase order' });
  }
};

// Workflow Actions
export const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('currentStage');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const currentStage = purchaseOrder.currentStage;
    
    // Check if approve action is allowed
    if (!currentStage.allowedActions.includes('approve')) {
      return res.status(403).json({ 
        message: 'Approval not allowed in current stage' 
      });
    }
    
    // Get next stage based on current stage
    let nextStageCode;
    switch (currentStage.code) {
      case 'PENDING_APPROVAL':
        nextStageCode = 'APPROVED_L1';
        break;
      case 'APPROVED_L1':
        nextStageCode = 'APPROVED_FINAL';
        break;
      case 'APPROVED_FINAL':
        nextStageCode = 'ORDERED';
        break;
      default:
        return res.status(400).json({ message: 'Invalid stage for approval' });
    }
    
    const nextStage = await WorkflowStage.findOne({ code: nextStageCode });
    
    // Update PO
    purchaseOrder.currentStage = nextStage._id;
    purchaseOrder.status = nextStageCode === 'ORDERED' ? 'ordered' : 'approved';
    
    if (nextStageCode === 'APPROVED_FINAL') {
      purchaseOrder.approvedBy = req.user._id;
      purchaseOrder.approvedDate = new Date();
    }
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: nextStage._id,
      action: 'approved',
      actionBy: req.user._id,
      remarks: remarks || `Approved at ${currentStage.name}`
    });
    
    await purchaseOrder.save();
    
    // Send email if ordered
    if (nextStageCode === 'ORDERED') {
      await sendPOEmail(purchaseOrder);
    }
    
    res.json({
      message: 'Purchase order approved successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({ message: 'Failed to approve purchase order' });
  }
};

export const rejectPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    if (!remarks) {
      return res.status(400).json({ message: 'Remarks required for rejection' });
    }
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('currentStage');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const currentStage = purchaseOrder.currentStage;
    
    // Check if reject action is allowed
    if (!currentStage.allowedActions.includes('reject')) {
      return res.status(403).json({ 
        message: 'Rejection not allowed in current stage' 
      });
    }
    
    const cancelledStage = await WorkflowStage.findOne({ code: 'CANCELLED' });
    
    // Update PO
    purchaseOrder.currentStage = cancelledStage._id;
    purchaseOrder.status = 'rejected';
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: cancelledStage._id,
      action: 'rejected',
      actionBy: req.user._id,
      remarks
    });
    
    await purchaseOrder.save();
    
    res.json({
      message: 'Purchase order rejected',
      purchaseOrder
    });
  } catch (error) {
    console.error('Reject purchase order error:', error);
    res.status(500).json({ message: 'Failed to reject purchase order' });
  }
};

// Delete PO (only draft)
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    // Only allow deletion of draft POs
    if (purchaseOrder.status !== 'draft') {
      return res.status(403).json({ 
        message: 'Only draft purchase orders can be deleted' 
      });
    }
    
    await PurchaseOrder.findByIdAndDelete(id);
    
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ message: 'Failed to delete purchase order' });
  }
};

export default {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  deletePurchaseOrder
};