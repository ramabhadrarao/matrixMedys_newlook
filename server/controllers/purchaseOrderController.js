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
    
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('principal', 'name gstNumber')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('currentStage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await PurchaseOrder.countDocuments(query);
    
    res.json({
      purchaseOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
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
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
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
      ccEmails
    } = req.body;
    
    // Get initial workflow stage
    const draftStage = await WorkflowStage.findOne({ code: 'DRAFT' });
    
    const purchaseOrder = new PurchaseOrder({
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
      remarks: 'Purchase order created'
    });
    
    await purchaseOrder.save();
    await purchaseOrder.populate('principal', 'name');
    await purchaseOrder.populate('currentStage');
    
    res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Failed to create purchase order' });
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