// server/controllers/warehouseApprovalController.js
import WarehouseApproval from '../models/WarehouseApproval.js';
import QualityControl from '../models/QualityControl.js';
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import Inventory from '../models/Inventory.js';
import Warehouse from '../models/Warehouse.js';

// Get warehouse approval record by ID
export const getWarehouseApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const warehouseApproval = await WarehouseApproval.findById(id)
      .populate('qualityControl', 'qcNumber qcDate overallResult')
      .populate('invoiceReceiving', 'invoiceNumber invoiceDate')
      .populate('purchaseOrder', 'poNumber poDate')
      .populate('assignedTo', 'name email')
      .populate('warehouseBy', 'name email')
      .populate('managerApprovals.approvedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    res.json({ data: warehouseApproval });

  } catch (error) {
    console.error('Get warehouse approval error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouse approval record' });
  }
};

// Get all warehouse approval records with filtering
export const getWarehouseApprovals = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { warehouseApprovalNumber: { $regex: search, $options: 'i' } },
        { 'invoiceReceiving.invoiceNumber': { $regex: search, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const warehouseApprovals = await WarehouseApproval.find(query)
      .populate('qualityControl', 'qcNumber qcDate')
      .populate('invoiceReceiving', 'invoiceNumber invoiceDate')
      .populate('purchaseOrder', 'poNumber poDate')
      .populate('assignedTo', 'name email')
      .populate('warehouseBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await WarehouseApproval.countDocuments(query);

    res.json({
      data: {
        warehouseApprovals,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get warehouse approvals error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouse approvals' });
  }
};

// Update product warehouse checks
export const updateProductWarehouseCheck = async (req, res) => {
  try {
    const { warehouseApprovalId, productIndex } = req.params;
    const { 
      storageLocation,
      storageConditions,
      physicalChecks,
      warehouseDecision,
      rejectionReasons,
      remarks 
    } = req.body;

    const warehouseApproval = await WarehouseApproval.findById(warehouseApprovalId);
    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    if (warehouseApproval.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update completed warehouse approval' });
    }

    const product = warehouseApproval.products[productIndex];
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update product details
    if (storageLocation) {
      product.storageLocation = { ...product.storageLocation, ...storageLocation };
    }

    if (storageConditions) {
      product.storageConditions = { ...product.storageConditions, ...storageConditions };
    }

    if (physicalChecks) {
      product.physicalChecks = { ...product.physicalChecks, ...physicalChecks };
    }

    product.warehouseDecision = warehouseDecision;
    product.rejectionReasons = rejectionReasons || [];
    product.remarks = remarks || '';
    product.warehouseDate = new Date();
    product.warehouseBy = req.user._id;

    // Update product status based on decision
    if (warehouseDecision === 'approved') {
      product.status = 'approved';
      product.approvedQty = product.warehouseQty;
    } else if (warehouseDecision === 'rejected') {
      product.status = 'rejected';
      product.approvedQty = 0;
    } else if (warehouseDecision === 'partial_approved') {
      product.status = 'partial_approved';
      // approvedQty should be provided in the request
      product.approvedQty = req.body.approvedQty || 0;
    }

    // Update overall status
    const completedProducts = warehouseApproval.products.filter(p => 
      p.status !== 'pending' && p.status !== 'in_progress'
    );

    if (completedProducts.length === warehouseApproval.products.length) {
      const allApproved = warehouseApproval.products.every(p => p.status === 'approved');
      const allRejected = warehouseApproval.products.every(p => p.status === 'rejected');

      if (allApproved) {
        warehouseApproval.overallResult = 'approved';
      } else if (allRejected) {
        warehouseApproval.overallResult = 'rejected';
      } else {
        warehouseApproval.overallResult = 'partial_approved';
      }

      warehouseApproval.status = 'pending_manager_approval';
    } else {
      warehouseApproval.status = 'in_progress';
    }

    warehouseApproval.updatedBy = req.user._id;
    await warehouseApproval.save();

    res.json({
      message: 'Product warehouse check updated successfully',
      data: {
        product,
        overallResult: warehouseApproval.overallResult,
        status: warehouseApproval.status
      }
    });

  } catch (error) {
    console.error('Update product warehouse check error:', error);
    res.status(500).json({ message: 'Failed to update product warehouse check' });
  }
};

// Submit for manager approval
export const submitForManagerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouseRemarks, environmentConditions } = req.body;

    const warehouseApproval = await WarehouseApproval.findById(id);
    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    if (warehouseApproval.status !== 'in_progress') {
      return res.status(400).json({ message: 'Warehouse approval is not in progress' });
    }

    // Check if all products are checked
    const allProductsChecked = warehouseApproval.products.every(product =>
      product.status !== 'pending' && product.status !== 'in_progress'
    );

    if (!allProductsChecked) {
      return res.status(400).json({ message: 'All products must be checked before submission' });
    }

    // Update warehouse approval
    warehouseApproval.status = 'pending_manager_approval';
    warehouseApproval.warehouseDate = new Date();
    warehouseApproval.warehouseBy = req.user._id;
    warehouseApproval.warehouseRemarks = warehouseRemarks;
    
    if (environmentConditions) {
      warehouseApproval.environmentConditions = { 
        ...warehouseApproval.environmentConditions, 
        ...environmentConditions 
      };
    }

    warehouseApproval.updatedBy = req.user._id;
    await warehouseApproval.save();

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.workflowStatus = 'warehouse_in_progress';
      await invoiceReceiving.save();
    }

    await warehouseApproval.populate([
      { path: 'warehouseBy', select: 'name email' }
    ]);

    res.json({
      message: 'Submitted for manager approval successfully',
      data: warehouseApproval
    });

  } catch (error) {
    console.error('Submit for manager approval error:', error);
    res.status(500).json({ message: 'Failed to submit for manager approval' });
  }
};

// Manager approval/rejection
export const managerApprovalAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvalLevel, remarks } = req.body; // action: 'approve' or 'reject'

    const warehouseApproval = await WarehouseApproval.findById(id);
    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    if (warehouseApproval.status !== 'pending_manager_approval') {
      return res.status(400).json({ message: 'Warehouse approval is not pending manager approval' });
    }

    // Add manager approval record
    const managerApproval = {
      level: approvalLevel || 1,
      approvedBy: req.user._id,
      approvalDate: new Date(),
      action,
      remarks: remarks || ''
    };

    warehouseApproval.managerApprovals.push(managerApproval);

    if (action === 'approve') {
      warehouseApproval.status = 'completed';
      warehouseApproval.approvalStatus = 'approved';
      warehouseApproval.finalApprovalDate = new Date();

      // Create inventory entries for approved products
      await createInventoryEntries(warehouseApproval, req.user._id);

      // Update invoice receiving status
      const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
      if (invoiceReceiving) {
        invoiceReceiving.workflowStatus = 'inventory_updated';
        await invoiceReceiving.save();
      }

    } else if (action === 'reject') {
      warehouseApproval.status = 'rejected';
      warehouseApproval.approvalStatus = 'rejected';

      // Update invoice receiving status
      const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
      if (invoiceReceiving) {
        invoiceReceiving.workflowStatus = 'rejected';
        await invoiceReceiving.save();
      }
    }

    warehouseApproval.updatedBy = req.user._id;
    await warehouseApproval.save();

    await warehouseApproval.populate([
      { path: 'managerApprovals.approvedBy', select: 'name email' }
    ]);

    res.json({
      message: `Warehouse approval ${action}d successfully`,
      data: warehouseApproval
    });

  } catch (error) {
    console.error('Manager approval action error:', error);
    res.status(500).json({ message: `Failed to ${action} warehouse approval` });
  }
};

// Approve warehouse approval
export const approveWarehouseApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalLevel, managerRemarks } = req.body;

    const warehouseApproval = await WarehouseApproval.findById(id);
    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    if (warehouseApproval.status !== 'pending_manager_approval') {
      return res.status(400).json({ message: 'Warehouse approval is not pending manager approval' });
    }

    // Add manager approval record
    const managerApproval = {
      level: approvalLevel || 1,
      approvedBy: req.user._id,
      approvalDate: new Date(),
      action: 'approve',
      remarks: managerRemarks || ''
    };

    warehouseApproval.managerApprovals.push(managerApproval);
    warehouseApproval.status = 'completed';
    warehouseApproval.approvalStatus = 'approved';
    warehouseApproval.finalApprovalDate = new Date();

    // Create inventory entries for approved products
    await createInventoryEntries(warehouseApproval, req.user._id);

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.workflowStatus = 'inventory_updated';
      await invoiceReceiving.save();
    }

    warehouseApproval.updatedBy = req.user._id;
    await warehouseApproval.save();

    await warehouseApproval.populate([
      { path: 'managerApprovals.approvedBy', select: 'name email' }
    ]);

    res.json({
      message: 'Warehouse approval approved successfully',
      data: warehouseApproval
    });

  } catch (error) {
    console.error('Approve warehouse approval error:', error);
    res.status(500).json({ message: 'Failed to approve warehouse approval' });
  }
};

// Reject warehouse approval
export const rejectWarehouseApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalLevel, managerRemarks } = req.body;

    const warehouseApproval = await WarehouseApproval.findById(id);
    if (!warehouseApproval) {
      return res.status(404).json({ message: 'Warehouse approval record not found' });
    }

    if (warehouseApproval.status !== 'pending_manager_approval') {
      return res.status(400).json({ message: 'Warehouse approval is not pending manager approval' });
    }

    // Add manager approval record
    const managerApproval = {
      level: approvalLevel || 1,
      approvedBy: req.user._id,
      approvalDate: new Date(),
      action: 'reject',
      remarks: managerRemarks || ''
    };

    warehouseApproval.managerApprovals.push(managerApproval);
    warehouseApproval.status = 'rejected';
    warehouseApproval.approvalStatus = 'rejected';

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.workflowStatus = 'rejected';
      await invoiceReceiving.save();
    }

    warehouseApproval.updatedBy = req.user._id;
    await warehouseApproval.save();

    await warehouseApproval.populate([
      { path: 'managerApprovals.approvedBy', select: 'name email' }
    ]);

    res.json({
      message: 'Warehouse approval rejected successfully',
      data: warehouseApproval
    });

  } catch (error) {
    console.error('Reject warehouse approval error:', error);
    res.status(500).json({ message: 'Failed to reject warehouse approval' });
  }
};
const createInventoryEntries = async (warehouseApproval, userId) => {
  try {
    const approvedProducts = warehouseApproval.products.filter(p => 
      p.status === 'approved' || (p.status === 'partial_approved' && p.approvedQty > 0)
    );

    const inventoryEntries = [];

    for (const product of approvedProducts) {
      // Get product history from related records
      const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving)
        .populate('purchaseOrder');
      
      const qualityControl = await QualityControl.findById(warehouseApproval.qualityControl);

      // Find default warehouse if not specified
      let warehouseId = product.storageLocation?.warehouse;
      if (!warehouseId) {
        const defaultWarehouse = await Warehouse.findOne({ isDefault: true });
        warehouseId = defaultWarehouse?._id;
      }

      const inventoryEntry = new Inventory({
        product: product.product,
        productCode: product.productCode,
        productName: product.productName,
        batchNo: product.batchNo,
        mfgDate: product.mfgDate,
        expDate: product.expDate,
        warehouse: warehouseId,
        location: {
          zone: product.storageLocation?.zone || 'A',
          rack: product.storageLocation?.rack || '1',
          shelf: product.storageLocation?.shelf || '1',
          bin: product.storageLocation?.bin || '1'
        },
        currentStock: product.approvedQty,
        availableStock: product.approvedQty,
        unitCost: 0, // Will be updated from invoice data
        totalValue: 0,
        
        // Storage conditions from warehouse approval
        storageConditions: product.storageConditions || {},
        
        // Complete product history
        productHistory: {
          purchaseOrder: {
            poId: invoiceReceiving.purchaseOrder._id,
            poNumber: invoiceReceiving.purchaseOrder.poNumber,
            poDate: invoiceReceiving.purchaseOrder.poDate,
            supplier: invoiceReceiving.purchaseOrder.principal,
            supplierName: invoiceReceiving.purchaseOrder.principalName || 'Unknown'
          },
          invoiceReceiving: {
            invoiceId: invoiceReceiving._id,
            invoiceNumber: invoiceReceiving.invoiceNumber,
            invoiceDate: invoiceReceiving.invoiceDate,
            receivedDate: invoiceReceiving.receivedDate,
            receivedBy: invoiceReceiving.receivedBy,
            receivedQty: product.qcPassedQty
          },
          qualityControl: {
            qcId: qualityControl._id,
            qcNumber: qualityControl.qcNumber,
            qcDate: qualityControl.qcDate,
            qcBy: qualityControl.qcBy,
            qcStatus: qualityControl.overallResult,
            qcPassedQty: product.qcPassedQty,
            qcFailedQty: product.warehouseQty - product.qcPassedQty,
            qcRemarks: qualityControl.qcRemarks
          },
          warehouseApproval: {
            warehouseApprovalId: warehouseApproval._id,
            warehouseApprovalNumber: warehouseApproval.warehouseApprovalNumber,
            warehouseApprovalDate: warehouseApproval.warehouseDate,
            warehouseApprovedBy: warehouseApproval.warehouseBy,
            warehouseApprovedQty: product.approvedQty,
            storageLocation: product.storageLocation
          },
          utilization: []
        },
        
        // Initial stock movement
        stockMovements: [{
          movementType: 'inward',
          quantity: product.approvedQty,
          reason: 'Initial stock from warehouse approval',
          remarks: `From invoice ${invoiceReceiving.invoiceNumber}`,
          movementDate: new Date(),
          movementBy: userId,
          referenceType: 'warehouse_approval',
          referenceId: warehouseApproval._id,
          referenceNumber: warehouseApproval.warehouseApprovalNumber
        }],
        
        createdBy: userId
      });

      inventoryEntries.push(inventoryEntry);
    }

    // Save all inventory entries
    const savedEntries = await Inventory.insertMany(inventoryEntries);

    // Update invoice receiving with inventory references
    const invoiceReceiving = await InvoiceReceiving.findById(warehouseApproval.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.inventoryEntries = savedEntries.map(entry => entry._id);
      invoiceReceiving.workflowStatus = 'completed';
      await invoiceReceiving.save();
    }

    return savedEntries;

  } catch (error) {
    console.error('Create inventory entries error:', error);
    throw error;
  }
};

// Get warehouse approval dashboard statistics
export const getWarehouseApprovalDashboard = async (req, res) => {
  try {
    const { timeframe = '30', warehouse } = req.query;
    
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(timeframe));
    
    let matchFilter = { createdAt: { $gte: dateFilter } };
    if (warehouse) {
      matchFilter.warehouse = warehouse;
    }

    // Get warehouse approval statistics
    const stats = await WarehouseApproval.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          pendingRecords: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgressRecords: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completedRecords: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          approvedRecords: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejectedRecords: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalProducts: { $sum: { $size: '$products' } },
          approvedProducts: { 
            $sum: { 
              $size: { 
                $filter: { 
                  input: '$products', 
                  cond: { $eq: ['$$this.status', 'approved'] } 
                } 
              } 
            } 
          },
          rejectedProducts: { 
            $sum: { 
              $size: { 
                $filter: { 
                  input: '$products', 
                  cond: { $eq: ['$$this.status', 'rejected'] } 
                } 
              } 
            } 
          }
        }
      }
    ]);

    // Get recent warehouse activities
    const recentActivities = await WarehouseApproval.find(matchFilter)
      .populate('assignedTo', 'name')
      .populate('invoiceReceiving', 'invoiceNumber')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('status waNumber assignedTo invoiceReceiving updatedAt products');

    // Get warehouse performance by user
    const userPerformance = await WarehouseApproval.aggregate([
      { $match: { ...matchFilter, status: 'completed' } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$assignedTo',
          totalProducts: { $sum: 1 },
          approvedProducts: { $sum: { $cond: [{ $eq: ['$products.status', 'approved'] }, 1, 0] } },
          avgProcessingTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userName: '$user.name',
          totalProducts: 1,
          approvedProducts: 1,
          approvalRate: { $multiply: [{ $divide: ['$approvedProducts', '$totalProducts'] }, 100] },
          avgProcessingHours: { $divide: ['$avgProcessingTime', 3600000] }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statistics: stats[0] || {
          totalRecords: 0,
          pendingRecords: 0,
          inProgressRecords: 0,
          completedRecords: 0,
          approvedRecords: 0,
          rejectedRecords: 0,
          totalProducts: 0,
          approvedProducts: 0,
          rejectedProducts: 0
        },
        recentActivities,
        userPerformance
      }
    });

  } catch (error) {
    console.error('Get warehouse approval dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch warehouse approval dashboard data',
      error: error.message 
    });
  }
};

// Bulk assign warehouse approval records to users
export const bulkAssignWarehouseApproval = async (req, res) => {
  try {
    const { warehouseApprovalIds, assignedTo, priority } = req.body;

    if (!warehouseApprovalIds || !Array.isArray(warehouseApprovalIds) || warehouseApprovalIds.length === 0) {
      return res.status(400).json({ message: 'Warehouse approval IDs array is required' });
    }

    if (!assignedTo) {
      return res.status(400).json({ message: 'Assigned user is required' });
    }

    const updateData = { assignedTo };
    if (priority) {
      updateData.priority = priority;
    }

    const result = await WarehouseApproval.updateMany(
      { 
        _id: { $in: warehouseApprovalIds },
        status: { $in: ['pending', 'in_progress'] }
      },
      updateData
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} warehouse approval records assigned successfully`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Bulk assign warehouse approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign warehouse approval records',
      error: error.message 
    });
  }
};

// Get warehouse approval workload by user
export const getWarehouseApprovalWorkload = async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    let matchFilter = {};
    if (status === 'active') {
      matchFilter.status = { $in: ['pending', 'in_progress'] };
    }

    const workload = await WarehouseApproval.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$assignedTo',
          totalRecords: { $sum: 1 },
          pendingRecords: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgressRecords: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          highPriorityRecords: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          urgentRecords: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userName: { $ifNull: ['$user.name', 'Unassigned'] },
          userEmail: { $ifNull: ['$user.email', 'N/A'] },
          totalRecords: 1,
          pendingRecords: 1,
          inProgressRecords: 1,
          highPriorityRecords: 1,
          urgentRecords: 1
        }
      },
      { $sort: { totalRecords: -1 } }
    ]);

    res.json({
      success: true,
      data: workload
    });

  } catch (error) {
    console.error('Get warehouse approval workload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch warehouse approval workload data',
      error: error.message 
    });
  }
};

// Get warehouse approval statistics
export const getWarehouseApprovalStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    // Status breakdown
    const statusStats = await WarehouseApproval.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Overall result breakdown
    const resultStats = await WarehouseApproval.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: '$overallResult',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average processing time
    const processingTimeStats = await WarehouseApproval.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          status: 'completed',
          finalApprovalDate: { $exists: true }
        } 
      },
      {
        $project: {
          processingHours: {
            $divide: [
              { $subtract: ['$finalApprovalDate', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingHours: { $avg: '$processingHours' },
          minProcessingHours: { $min: '$processingHours' },
          maxProcessingHours: { $max: '$processingHours' }
        }
      }
    ]);

    res.json({
      data: {
        statusBreakdown: statusStats,
        resultBreakdown: resultStats,
        processingTime: processingTimeStats[0] || {
          avgProcessingHours: 0,
          minProcessingHours: 0,
          maxProcessingHours: 0
        }
      }
    });

  } catch (error) {
    console.error('Get warehouse approval statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouse approval statistics' });
  }
};

// Create warehouse approval from QC record
export const createWarehouseApproval = async (req, res) => {
  try {
    const { qcId } = req.params;
    const { priority = 'medium', assignedTo } = req.body;

    const qcRecord = await QualityControl.findById(qcId)
      .populate('invoiceReceiving')
      .populate('purchaseOrder');

    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status !== 'completed') {
      return res.status(400).json({ message: 'QC record must be completed before sending to warehouse approval' });
    }

    // Check if warehouse approval already exists
    const existingWarehouseApproval = await WarehouseApproval.findOne({ qualityControl: qcId });
    if (existingWarehouseApproval) {
      return res.status(400).json({ message: 'Warehouse approval already exists for this QC record' });
    }

    // Get only passed products
    const passedProducts = qcRecord.products.filter(p => 
      p.overallStatus === 'passed' || p.overallStatus === 'partial_pass'
    );

    if (passedProducts.length === 0) {
      return res.status(400).json({ message: 'No products passed QC to send for warehouse approval' });
    }

    const warehouseApproval = new WarehouseApproval({
      qualityControl: qcRecord._id,
      invoiceReceiving: qcRecord.invoiceReceiving._id,
      purchaseOrder: qcRecord.purchaseOrder._id,
      warehouse: qcRecord.warehouse || null, // Add warehouse field if available
      priority,
      assignedTo: assignedTo || req.user._id,
      products: passedProducts.map(product => ({
        qualityControlProduct: product._id, // Add the required reference
        product: product.product,
        productCode: product.productCode,
        productName: product.productName,
        batchNo: product.batchNo,
        mfgDate: product.mfgDate,
        expDate: product.expDate,
        qcPassedQty: product.passedQty,
        warehouseQty: product.passedQty,
        status: 'pending'
      })),
      createdBy: req.user._id
    });

    await warehouseApproval.save();

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving._id);
    if (invoiceReceiving) {
      invoiceReceiving.warehouseApproval = warehouseApproval._id;
      invoiceReceiving.workflowStatus = 'warehouse_pending';
      await invoiceReceiving.save();
    }

    await warehouseApproval.populate([
      { path: 'qualityControl', select: 'qcNumber qcDate overallResult' },
      { path: 'invoiceReceiving', select: 'invoiceNumber invoiceDate' },
      { path: 'purchaseOrder', select: 'poNumber poDate' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'QC sent to warehouse approval successfully',
      data: warehouseApproval
    });

  } catch (error) {
    console.error('Create warehouse approval error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send QC to warehouse approval',
      error: error.message 
    });
  }
};

export default {
  getWarehouseApproval,
  getWarehouseApprovals,
  createWarehouseApproval,
  updateProductWarehouseCheck,
  submitForManagerApproval,
  managerApprovalAction,
  approveWarehouseApproval,
  rejectWarehouseApproval,
  getWarehouseApprovalDashboard,
  bulkAssignWarehouseApproval,
  getWarehouseApprovalWorkload,
  getWarehouseApprovalStatistics
};