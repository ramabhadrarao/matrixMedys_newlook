// server/controllers/purchaseOrderController.js
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';
import Principal from '../models/Principal.js';
import Product from '../models/Product.js';
import { sendPOEmail } from '../services/emailService.js';

// Helper function to generate principal code
const getPrincipalCode = (principalName) => {
  // Split by spaces and take first letter of each word, max 3 characters
  const words = principalName.trim().split(/\s+/);
  let code = '';
  
  if (words.length === 1) {
    // Single word - take first 3 characters
    code = words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words - take first letter of each word, max 3
    code = words.slice(0, 3).map(word => word.charAt(0)).join('').toUpperCase();
  }
  
  return code.padEnd(3, 'X'); // Pad with X if less than 3 characters
};

// Helper function to generate PO number
const generatePONumber = async (principalId, customDate = null) => {
  try {
    // Get principal details
    const principal = await Principal.findById(principalId);
    if (!principal) {
      throw new Error('Principal not found');
    }
    
    // Generate principal code
    const principalCode = getPrincipalCode(principal.name);
    
    // Use provided date or current date
    const date = customDate ? new Date(customDate) : new Date();
    const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().substr(-2)}`;
    
    // Find the highest sequence number for this principal on this date
    const datePattern = `MM-${principalCode}-${dateStr}`;
    const existingPOs = await PurchaseOrder.find({
      principal: principalId,
      poNumber: { $regex: `^${datePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/` }
    }).sort({ poNumber: -1 }).limit(1);
    
    let nextSequence = 1;
    
    if (existingPOs.length > 0) {
      // Extract sequence number from the last PO
      const lastPONumber = existingPOs[0].poNumber;
      const sequencePart = lastPONumber.split('/')[1];
      if (sequencePart) {
        nextSequence = parseInt(sequencePart) + 1;
      }
    }
    
    // Generate final PO number
    const sequenceStr = nextSequence.toString().padStart(3, '0');
    const poNumber = `${datePattern}/${sequenceStr}`;
    
    // Double-check for uniqueness (in case of race conditions)
    const duplicateCheck = await PurchaseOrder.findOne({ poNumber });
    if (duplicateCheck) {
      // If duplicate found, recursively try with next sequence
      return await generatePONumberRecursive(principalId, customDate, nextSequence + 1);
    }
    
    return poNumber;
    
  } catch (error) {
    console.error('Error generating PO number:', error);
    throw error;
  }
};

// Recursive function for handling race conditions
const generatePONumberRecursive = async (principalId, customDate = null, startSequence = 1) => {
  try {
    const principal = await Principal.findById(principalId);
    if (!principal) {
      throw new Error('Principal not found');
    }
    
    const principalCode = getPrincipalCode(principal.name);
    const date = customDate ? new Date(customDate) : new Date();
    const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().substr(-2)}`;
    
    const sequenceStr = startSequence.toString().padStart(3, '0');
    const poNumber = `MM-${principalCode}-${dateStr}/${sequenceStr}`;
    
    // Check for uniqueness
    const existingPO = await PurchaseOrder.findOne({ poNumber });
    if (existingPO) {
      // Try with next sequence
      return await generatePONumberRecursive(principalId, customDate, startSequence + 1);
    }
    
    return poNumber;
    
  } catch (error) {
    console.error('Error generating PO number recursively:', error);
    throw error;
  }
};

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
    
    // Handle multiple status values (comma-separated)
    if (status) {
      if (status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        query.status = { $in: statusArray };
      } else {
        query.status = status;
      }
    }
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
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      poNumber, // Optional - will auto-generate if not provided
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
    
    // Validate principal exists
    const principalDoc = await Principal.findById(principal);
    if (!principalDoc) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Generate or validate PO number
    let finalPoNumber = poNumber;
    if (!finalPoNumber) {
      // Auto-generate PO number
      finalPoNumber = await generatePONumber(principal, poDate);
      console.log('Generated PO Number:', finalPoNumber);
    } else {
      // Validate provided PO number is unique
      const existingPO = await PurchaseOrder.findOne({ poNumber: finalPoNumber });
      if (existingPO) {
        return res.status(400).json({ 
          message: 'PO number already exists',
          existingPO: finalPoNumber 
        });
      }
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
        requiredPermissions: [],
        nextStages: [],
        isActive: true,
        createdBy: req.user._id
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
      purchaseOrder,
      generatedPONumber: !poNumber ? finalPoNumber : undefined // Show generated number
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
    
    await purchaseOrder.populate('principal', 'name gstNumber email');
    await purchaseOrder.populate('currentStage');
    await purchaseOrder.populate('updatedBy', 'name email');
    
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

// Submit purchase order for approval
export const submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('currentStage');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const currentStage = purchaseOrder.currentStage;
    
    // Check if PO is in draft stage
    if (currentStage.code !== 'DRAFT') {
      return res.status(400).json({ 
        message: 'Purchase order can only be submitted from draft stage' 
      });
    }
    
    // Get pending approval stage
    const pendingApprovalStage = await WorkflowStage.findOne({ code: 'PENDING_APPROVAL' });
    if (!pendingApprovalStage) {
      return res.status(404).json({ message: 'Pending approval stage not found' });
    }
    
    // Update purchase order
    purchaseOrder.status = 'pending_approval';
    purchaseOrder.currentStage = pendingApprovalStage._id;
    purchaseOrder.updatedBy = req.user.id;
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: pendingApprovalStage._id,
      action: 'submit_for_approval',
      actionBy: req.user.id,
      actionDate: new Date(),
      remarks: remarks || 'Submitted for approval'
    });
    
    await purchaseOrder.save();
    
    // Populate for response
    await purchaseOrder.populate([
      { path: 'principal', select: 'name email mobile gstNumber' },
      { path: 'currentStage' },
      { path: 'workflowHistory.stage', select: 'name code' },
      { path: 'workflowHistory.actionBy', select: 'name email' }
    ]);
    
    res.json({
      message: 'Purchase order submitted for approval successfully',
      purchaseOrder
    });
    
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({ message: 'Failed to submit purchase order for approval' });
  }
};

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
      case 'DRAFT':
        nextStageCode = 'PENDING_APPROVAL';
        break;
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
    if (!nextStage) {
      return res.status(404).json({ message: `Next stage ${nextStageCode} not found` });
    }
    
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
      try {
        await sendPOEmail(purchaseOrder);
      } catch (emailError) {
        console.error('Failed to send PO email:', emailError);
        // Don't fail the approval, just log the error
      }
    }
    
    await purchaseOrder.populate('principal', 'name gstNumber email');
    await purchaseOrder.populate('currentStage');
    await purchaseOrder.populate('approvedBy', 'name email');
    
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
    
    let rejectedStage = await WorkflowStage.findOne({ code: 'REJECTED' });
    
    // Create REJECTED stage if it doesn't exist
    if (!rejectedStage) {
      rejectedStage = new WorkflowStage({
        name: 'Rejected',
        code: 'REJECTED',
        description: 'Purchase order rejected',
        sequence: 999,
        allowedActions: ['edit'],
        requiredPermissions: [],
        nextStages: [],
        isActive: true,
        createdBy: req.user._id
      });
      await rejectedStage.save();
    }
    
    // Update PO
    purchaseOrder.currentStage = rejectedStage._id;
    purchaseOrder.status = 'rejected';
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: rejectedStage._id,
      action: 'rejected',
      actionBy: req.user._id,
      remarks
    });
    
    await purchaseOrder.save();
    
    await purchaseOrder.populate('principal', 'name gstNumber email');
    await purchaseOrder.populate('currentStage');
    
    res.json({
      message: 'Purchase order rejected',
      purchaseOrder
    });
  } catch (error) {
    console.error('Reject purchase order error:', error);
    res.status(500).json({ message: 'Failed to reject purchase order' });
  }
};

export const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('currentStage');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const currentStage = purchaseOrder.currentStage;
    
    // Check if cancel action is allowed
    if (!currentStage.allowedActions.includes('cancel')) {
      return res.status(403).json({ 
        message: 'Cancellation not allowed in current stage' 
      });
    }
    
    let cancelledStage = await WorkflowStage.findOne({ code: 'CANCELLED' });
    
    // Create CANCELLED stage if it doesn't exist
    if (!cancelledStage) {
      cancelledStage = new WorkflowStage({
        name: 'Cancelled',
        code: 'CANCELLED',
        description: 'Purchase order cancelled',
        sequence: 998,
        allowedActions: [],
        requiredPermissions: [],
        nextStages: [],
        isActive: true,
        createdBy: req.user._id
      });
      await cancelledStage.save();
    }
    
    // Update PO
    purchaseOrder.currentStage = cancelledStage._id;
    purchaseOrder.status = 'cancelled';
    
    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: cancelledStage._id,
      action: 'cancelled',
      actionBy: req.user._id,
      remarks: remarks || 'Purchase order cancelled'
    });
    
    await purchaseOrder.save();
    
    await purchaseOrder.populate('principal', 'name gstNumber email');
    await purchaseOrder.populate('currentStage');
    
    res.json({
      message: 'Purchase order cancelled successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({ message: 'Failed to cancel purchase order' });
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

// Function to get next PO number preview (useful for frontend)
export const getNextPONumber = async (req, res) => {
  try {
    const { principalId, date } = req.query;
    
    if (!principalId) {
      return res.status(400).json({ message: 'Principal ID is required' });
    }
    
    const nextPONumber = await generatePONumber(principalId, date);
    
    res.json({ 
      nextPONumber,
      preview: true
    });
  } catch (error) {
    console.error('Get next PO number error:', error);
    res.status(500).json({ 
      message: 'Failed to generate PO number preview',
      error: error.message 
    });
  }
};

// Function to validate PO number format
export const validatePONumber = async (req, res) => {
  try {
    const { poNumber, principalId } = req.body;
    
    if (!poNumber) {
      return res.status(400).json({ message: 'PO number is required' });
    }
    
    // Check if PO number already exists
    const existingPO = await PurchaseOrder.findOne({ poNumber });
    if (existingPO) {
      return res.status(409).json({ 
        message: 'PO number already exists',
        isValid: false,
        existingPO: {
          id: existingPO._id,
          poNumber: existingPO.poNumber,
          principal: existingPO.principal,
          status: existingPO.status,
          createdAt: existingPO.createdAt
        }
      });
    }
    
    // Validate format if principal is provided
    if (principalId) {
      const principal = await Principal.findById(principalId);
      if (principal) {
        const expectedCode = getPrincipalCode(principal.name);
        const poPattern = new RegExp(`^MM-${expectedCode}-\\d{6}/\\d{3}$`);
        
        if (!poPattern.test(poNumber)) {
          return res.status(400).json({
            message: `PO number format should be MM-${expectedCode}-DDMMYY/XXX`,
            isValid: false,
            expectedFormat: `MM-${expectedCode}-DDMMYY/XXX`,
            example: `MM-${expectedCode}-150925/001`
          });
        }
      }
    }
    
    res.json({ 
      message: 'PO number is valid',
      isValid: true,
      poNumber
    });
  } catch (error) {
    console.error('Validate PO number error:', error);
    res.status(500).json({ 
      message: 'Failed to validate PO number',
      error: error.message 
    });
  }
};

// Get PO statistics
export const getPurchaseOrderStats = async (req, res) => {
  try {
    const { fromDate, toDate, principal } = req.query;
    
    let matchQuery = {};
    
    if (fromDate || toDate) {
      matchQuery.poDate = {};
      if (fromDate) matchQuery.poDate.$gte = new Date(fromDate);
      if (toDate) matchQuery.poDate.$lte = new Date(toDate);
    }
    
    if (principal) {
      matchQuery.principal = new mongoose.Types.ObjectId(principal);
    }
    
    const stats = await PurchaseOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' }
        }
      }
    ]);
    
    const totalPOs = await PurchaseOrder.countDocuments(matchQuery);
    const totalValue = await PurchaseOrder.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    
    res.json({
      stats,
      summary: {
        totalPOs,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get PO stats error:', error);
    res.status(500).json({ message: 'Failed to fetch PO statistics' });
  }
};

// Send PO via email
export const sendPurchaseOrderEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('principal')
      .populate('products.product')
      .populate('createdBy', 'name email');
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    // Use provided recipient email or default to principal email
    const emailRecipient = recipientEmail || purchaseOrder.principal?.email || 'contact@matrixpharma.com';
    
    const result = await sendPOEmail(purchaseOrder, emailRecipient);
    
    if (result.success) {
      // Update PO status to 'ordered' after successful email sending
      const orderedStage = await WorkflowStage.findOne({ code: 'ORDERED' });
      if (orderedStage) {
        purchaseOrder.status = 'ordered';
        purchaseOrder.currentStage = orderedStage._id;
        purchaseOrder.updatedBy = req.user._id;
        
        // Add to workflow history
        purchaseOrder.workflowHistory.push({
          stage: orderedStage._id,
          action: 'ordered',
          actionBy: req.user._id,
          actionDate: new Date(),
          remarks: 'Purchase order sent to supplier and status changed to ordered'
        });
        
        await purchaseOrder.save();
      }
      
      res.json({ 
        message: 'Purchase order sent successfully and status updated to ordered',
        success: true 
      });
    } else if (result.error === 'GMAIL_LIMIT_EXCEEDED') {
      // Handle Gmail limit exceeded case
      res.status(429).json({ 
        message: result.message,
        error: 'GMAIL_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        pdfPath: result.pdfPath,
        success: false
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to send purchase order email',
        success: false 
      });
    }
  } catch (error) {
    console.error('Send PO email error:', error);
    
    // Check if it's a Gmail limit error
    if (error.code === 'EENVELOPE' && error.responseCode === 550) {
      return res.status(429).json({ 
        message: 'Gmail daily sending limit exceeded. Please try again after 24 hours.',
        error: 'GMAIL_LIMIT_EXCEEDED',
        retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000),
        success: false
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to send purchase order email',
      error: error.message,
      success: false 
    });
  }
};

export default {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
  getNextPONumber,
  validatePONumber,
  getPurchaseOrderStats,
  sendPurchaseOrderEmail
};