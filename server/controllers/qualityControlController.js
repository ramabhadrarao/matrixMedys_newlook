// server/controllers/qualityControlController.js
import QualityControl from '../models/QualityControl.js';
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import WarehouseApproval from '../models/WarehouseApproval.js';
import WorkflowStage from '../models/WorkflowStage.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// Create QC record from Invoice Receiving
export const createQCFromInvoice = async (req, res) => {
  try {
    const { invoiceReceivingId } = req.params;
    const { qcType = 'standard', priority = 'medium', assignedTo } = req.body;

    // Get invoice receiving data
    const invoiceReceiving = await InvoiceReceiving.findById(invoiceReceivingId)
      .populate('purchaseOrder');

    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }

    if (invoiceReceiving.qualityControl) {
      return res.status(400).json({ message: 'QC record already exists for this invoice' });
    }

    // Create QC products from received products
    const qcProducts = invoiceReceiving.products.map(product => ({
      product: product.product,
      productCode: product.productCode,
      productName: product.productName,
      batchNo: product.batchNo,
      mfgDate: product.mfgDate,
      expDate: product.expDate,
      receivedQty: product.receivedQty,
      qcQty: product.receivedQty, // Initially all received qty goes for QC
      
      // Create item details for each unit
      itemDetails: Array.from({ length: product.receivedQty }, (_, index) => ({
        itemNumber: index + 1,
        status: 'pending',
        qcReasons: [],
        remarks: ''
      })),
      
      overallStatus: 'pending',
      qcSummary: {
        received_correctly: 0,
        damaged_packaging: 0,
        damaged_product: 0,
        expired: 0,
        near_expiry: 0,
        wrong_product: 0,
        quantity_mismatch: 0,
        quality_issue: 0,
        labeling_issue: 0,
        other: 0
      }
    }));

    // Create QC record
    const qualityControl = new QualityControl({
      invoiceReceiving: invoiceReceivingId,
      purchaseOrder: invoiceReceiving.purchaseOrder._id,
      qcType,
      priority,
      assignedTo: assignedTo || req.user._id,
      products: qcProducts,
      qcEnvironment: {
        temperature: null,
        humidity: null,
        lightCondition: 'normal'
      },
      createdBy: req.user._id
    });

    await qualityControl.save();

    // Update invoice receiving
    invoiceReceiving.qualityControl = qualityControl._id;
    invoiceReceiving.workflowStatus = 'qc_in_progress';
    invoiceReceiving.qcStatus = 'in_progress';
    await invoiceReceiving.save();

    await qualityControl.populate([
      { path: 'invoiceReceiving', select: 'invoiceNumber invoiceDate' },
      { path: 'purchaseOrder', select: 'poNumber poDate' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      message: 'QC record created successfully',
      data: qualityControl
    });

  } catch (error) {
    console.error('Create QC error:', error);
    res.status(500).json({ message: 'Failed to create QC record' });
  }
};

// Get QC record by ID
export const getQCRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const qcRecord = await QualityControl.findById(id)
      .populate('invoiceReceiving', 'invoiceNumber invoiceDate receivedBy')
      .populate('purchaseOrder', 'poNumber poDate')
      .populate('assignedTo', 'name email')
      .populate('qcBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    res.json({ data: qcRecord });

  } catch (error) {
    console.error('Get QC record error:', error);
    res.status(500).json({ message: 'Failed to fetch QC record' });
  }
};

// Get all QC records with filtering
export const getQCRecords = async (req, res) => {
  try {
    const {
      status,
      qcType,
      priority,
      assignedTo,
      result, // Changed from overallResult to result
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (qcType) query.qcType = qcType;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (result) query.overallResult = result; // Map result parameter to overallResult field

    if (search) {
      query.$or = [
        { qcNumber: { $regex: search, $options: 'i' } },
        { 'invoiceReceiving.invoiceNumber': { $regex: search, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const qcRecords = await QualityControl.find(query)
      .populate('invoiceReceiving', 'invoiceNumber invoiceDate')
      .populate('assignedTo', 'name email')
      .populate('products.qcBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await QualityControl.countDocuments(query);

    res.json({
      data: {
        qcRecords,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get QC records error:', error);
    res.status(500).json({ message: 'Failed to fetch QC records' });
  }
};

// Update item-level QC details
export const updateItemQC = async (req, res) => {
  try {
    const { qcId, productIndex, itemIndex } = req.params;
    const { status, qcReasons, remarks } = req.body;

    const qcRecord = await QualityControl.findById(qcId);
    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update completed QC record' });
    }

    const product = qcRecord.products[productIndex];
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const item = product.itemDetails[itemIndex];
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Update item details
    item.status = status;
    item.qcReasons = qcReasons || [];
    item.remarks = remarks || '';
    item.qcDate = new Date();
    item.qcBy = req.user._id;

    // Update QC summary for the product
    product.qcSummary = {
      received_correctly: 0,
      damaged_packaging: 0,
      damaged_product: 0,
      expired: 0,
      near_expiry: 0,
      wrong_product: 0,
      quantity_mismatch: 0,
      quality_issue: 0,
      labeling_issue: 0,
      other: 0
    };

    // Count statuses
    product.itemDetails.forEach(itemDetail => {
      if (itemDetail.status !== 'pending') {
        if (itemDetail.qcReasons.length === 0) {
          product.qcSummary.received_correctly++;
        } else {
          itemDetail.qcReasons.forEach(reason => {
            if (product.qcSummary.hasOwnProperty(reason)) {
              product.qcSummary[reason]++;
            }
          });
        }
      }
    });

    // Update product overall status
    const completedItems = product.itemDetails.filter(item => item.status !== 'pending');
    const passedItems = product.itemDetails.filter(item => 
      item.status === 'passed' || (item.status !== 'pending' && item.qcReasons.length === 0)
    );

    if (completedItems.length === 0) {
      product.overallStatus = 'pending';
    } else if (completedItems.length === product.itemDetails.length) {
      if (passedItems.length === product.itemDetails.length) {
        product.overallStatus = 'passed';
      } else if (passedItems.length === 0) {
        product.overallStatus = 'failed';
      } else {
        product.overallStatus = 'partial_pass';
      }
    } else {
      product.overallStatus = 'in_progress';
    }

    product.passedQty = passedItems.length;
    product.failedQty = completedItems.length - passedItems.length;

    // Update overall QC status
    const allProductsCompleted = qcRecord.products.every(p => 
      p.overallStatus !== 'pending' && p.overallStatus !== 'in_progress'
    );

    if (allProductsCompleted) {
      const allPassed = qcRecord.products.every(p => p.overallStatus === 'passed');
      const allFailed = qcRecord.products.every(p => p.overallStatus === 'failed');

      if (allPassed) {
        qcRecord.overallResult = 'passed';
      } else if (allFailed) {
        qcRecord.overallResult = 'failed';
      } else {
        qcRecord.overallResult = 'partial_pass';
      }
    }

    qcRecord.updatedBy = req.user._id;
    await qcRecord.save();

    res.json({
      message: 'Item QC updated successfully',
      data: {
        item,
        product: {
          overallStatus: product.overallStatus,
          qcSummary: product.qcSummary,
          passedQty: product.passedQty,
          failedQty: product.failedQty
        },
        overallResult: qcRecord.overallResult
      }
    });

  } catch (error) {
    console.error('Update item QC error:', error);
    res.status(500).json({ message: 'Failed to update item QC' });
  }
};

// Submit QC for approval
export const submitQCForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcRemarks, qcEnvironment } = req.body;

    const qcRecord = await QualityControl.findById(id);
    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status !== 'in_progress') {
      return res.status(400).json({ message: 'QC record is not in progress' });
    }

    // Check if all items are QC'd
    const allItemsCompleted = qcRecord.products.every(product =>
      product.itemDetails.every(item => item.status !== 'pending')
    );

    if (!allItemsCompleted) {
      return res.status(400).json({ message: 'All items must be QC checked before submission' });
    }

    // Update QC record
    qcRecord.status = 'pending_approval';
    qcRecord.qcDate = new Date();
    qcRecord.qcBy = req.user._id;
    qcRecord.qcRemarks = qcRemarks;
    
    if (qcEnvironment) {
      qcRecord.qcEnvironment = { ...qcRecord.qcEnvironment, ...qcEnvironment };
    }

    qcRecord.updatedBy = req.user._id;
    await qcRecord.save();

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.workflowStatus = 'qc_completed';
      invoiceReceiving.qcStatus = qcRecord.overallResult;
      await invoiceReceiving.save();
    }

    await qcRecord.populate([
      { path: 'qcBy', select: 'name email' }
    ]);

    res.json({
      message: 'QC submitted for approval successfully',
      data: qcRecord
    });

  } catch (error) {
    console.error('Submit QC for approval error:', error);
    res.status(500).json({ message: 'Failed to submit QC for approval' });
  }
};

// Approve/Reject QC
export const approveRejectQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvalRemarks } = req.body; // action: 'approve' or 'reject'

    const qcRecord = await QualityControl.findById(id);
    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status !== 'pending_approval') {
      return res.status(400).json({ message: 'QC record is not pending approval' });
    }

    if (action === 'approve') {
      qcRecord.status = 'completed';
      qcRecord.approvalStatus = 'approved';
      
      // Create warehouse approval for passed products
      const passedProducts = qcRecord.products.filter(p => 
        p.overallStatus === 'passed' || p.overallStatus === 'partial_pass'
      );

      if (passedProducts.length > 0) {
        const warehouseApproval = new WarehouseApproval({
          qualityControl: qcRecord._id,
          invoiceReceiving: qcRecord.invoiceReceiving,
          purchaseOrder: qcRecord.purchaseOrder,
          products: passedProducts.map(product => ({
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

        // Update invoice receiving with warehouse approval reference
        const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving);
        if (invoiceReceiving) {
          invoiceReceiving.warehouseApproval = warehouseApproval._id;
          invoiceReceiving.workflowStatus = 'warehouse_pending';
          await invoiceReceiving.save();
        }
      }

    } else if (action === 'reject') {
      qcRecord.status = 'rejected';
      qcRecord.approvalStatus = 'rejected';

      // Update invoice receiving status
      const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving);
      if (invoiceReceiving) {
        invoiceReceiving.workflowStatus = 'rejected';
        invoiceReceiving.status = 'rejected';
        await invoiceReceiving.save();
      }
    }

    qcRecord.approvalDate = new Date();
    qcRecord.approvedBy = req.user._id;
    qcRecord.approvalRemarks = approvalRemarks;
    qcRecord.updatedBy = req.user._id;

    await qcRecord.save();

    await qcRecord.populate([
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      message: `QC ${action}d successfully`,
      data: qcRecord
    });

  } catch (error) {
    console.error('Approve/Reject QC error:', error);
    res.status(500).json({ message: `Failed to ${action} QC` });
  }
};

// Approve QC record
export const approveQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalRemarks } = req.body;

    const qcRecord = await QualityControl.findById(id);
    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status !== 'pending_approval') {
      return res.status(400).json({ message: 'QC record is not pending approval' });
    }

    qcRecord.status = 'completed';
    qcRecord.approvalStatus = 'approved';
    
    // Create warehouse approval for passed products
    const passedProducts = qcRecord.products.filter(p => 
      p.overallStatus === 'passed' || p.overallStatus === 'partial_pass'
    );

    if (passedProducts.length > 0) {
      const warehouseApproval = new WarehouseApproval({
        qualityControl: qcRecord._id,
        invoiceReceiving: qcRecord.invoiceReceiving,
        purchaseOrder: qcRecord.purchaseOrder,
        products: passedProducts.map(product => ({
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

      // Update invoice receiving with warehouse approval reference
      const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving);
      if (invoiceReceiving) {
        invoiceReceiving.warehouseApproval = warehouseApproval._id;
        invoiceReceiving.workflowStatus = 'warehouse_pending';
        await invoiceReceiving.save();
      }
    }

    qcRecord.approvalDate = new Date();
    qcRecord.approvedBy = req.user._id;
    qcRecord.approvalRemarks = approvalRemarks;
    qcRecord.updatedBy = req.user._id;

    await qcRecord.save();

    await qcRecord.populate([
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      message: 'QC approved successfully',
      data: qcRecord
    });

  } catch (error) {
    console.error('Approve QC error:', error);
    res.status(500).json({ message: 'Failed to approve QC' });
  }
};

// Reject QC record
export const rejectQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalRemarks } = req.body;

    const qcRecord = await QualityControl.findById(id);
    if (!qcRecord) {
      return res.status(404).json({ message: 'QC record not found' });
    }

    if (qcRecord.status !== 'pending_approval') {
      return res.status(400).json({ message: 'QC record is not pending approval' });
    }

    qcRecord.status = 'rejected';
    qcRecord.approvalStatus = 'rejected';

    // Update invoice receiving status
    const invoiceReceiving = await InvoiceReceiving.findById(qcRecord.invoiceReceiving);
    if (invoiceReceiving) {
      invoiceReceiving.workflowStatus = 'rejected';
      invoiceReceiving.status = 'rejected';
      await invoiceReceiving.save();
    }

    qcRecord.approvalDate = new Date();
    qcRecord.approvedBy = req.user._id;
    qcRecord.approvalRemarks = approvalRemarks;
    qcRecord.updatedBy = req.user._id;

    await qcRecord.save();

    await qcRecord.populate([
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      message: 'QC rejected successfully',
      data: qcRecord
    });

  } catch (error) {
    console.error('Reject QC error:', error);
    res.status(500).json({ message: 'Failed to reject QC' });
  }
};

// Get QC dashboard statistics for managers
export const getQCDashboard = async (req, res) => {
  try {
    const { timeframe = '30', warehouse } = req.query;
    
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(timeframe));
    
    let matchFilter = { createdAt: { $gte: dateFilter } };
    if (warehouse) {
      matchFilter.warehouse = warehouse;
    }

    // Get QC statistics
    const stats = await QualityControl.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          pendingRecords: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgressRecords: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completedRecords: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rejectedRecords: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalProducts: { $sum: { $size: '$products' } },
          passedProducts: { 
            $sum: { 
              $size: { 
                $filter: { 
                  input: '$products', 
                  cond: { $eq: ['$$this.overallStatus', 'passed'] } 
                } 
              } 
            } 
          },
          failedProducts: { 
            $sum: { 
              $size: { 
                $filter: { 
                  input: '$products', 
                  cond: { $eq: ['$$this.overallStatus', 'failed'] } 
                } 
              } 
            } 
          }
        }
      }
    ]);

    // Get recent QC activities
    const recentActivities = await QualityControl.find(matchFilter)
      .populate('assignedTo', 'name')
      .populate('invoiceReceiving', 'invoiceNumber')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('status qcNumber assignedTo invoiceReceiving updatedAt products');

    // Get QC performance by user
    const userPerformance = await QualityControl.aggregate([
      { $match: { ...matchFilter, status: 'completed' } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$assignedTo',
          totalProducts: { $sum: 1 },
          passedProducts: { $sum: { $cond: [{ $eq: ['$products.overallStatus', 'passed'] }, 1, 0] } },
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
          passedProducts: 1,
          passRate: { $multiply: [{ $divide: ['$passedProducts', '$totalProducts'] }, 100] },
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
          rejectedRecords: 0,
          totalProducts: 0,
          passedProducts: 0,
          failedProducts: 0
        },
        recentActivities,
        userPerformance
      }
    });

  } catch (error) {
    console.error('Get QC dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch QC dashboard data',
      error: error.message 
    });
  }
};

// Bulk assign QC records to users
export const bulkAssignQC = async (req, res) => {
  try {
    const { qcIds, assignedTo, priority } = req.body;

    if (!qcIds || !Array.isArray(qcIds) || qcIds.length === 0) {
      return res.status(400).json({ message: 'QC IDs array is required' });
    }

    if (!assignedTo) {
      return res.status(400).json({ message: 'Assigned user is required' });
    }

    const updateData = { assignedTo };
    if (priority) {
      updateData.priority = priority;
    }

    const result = await QualityControl.updateMany(
      { 
        _id: { $in: qcIds },
        status: { $in: ['pending', 'in_progress'] }
      },
      updateData
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} QC records assigned successfully`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Bulk assign QC error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign QC records',
      error: error.message 
    });
  }
};

// Get QC workload by user
export const getQCWorkload = async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    let matchFilter = {};
    if (status === 'active') {
      matchFilter.status = { $in: ['pending', 'in_progress'] };
    }

    const workload = await QualityControl.aggregate([
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
    console.error('Get QC workload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch QC workload data',
      error: error.message 
    });
  }
};

// Get QC statistics
export const getQCStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    // Status breakdown
    const statusStats = await QualityControl.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Overall result breakdown
    const resultStats = await QualityControl.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: '$overallResult',
          count: { $sum: 1 }
        }
      }
    ]);

    // QC type breakdown
    const typeStats = await QualityControl.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$qcType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average processing time
    const processingTimeStats = await QualityControl.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          status: 'completed',
          qcDate: { $exists: true }
        } 
      },
      {
        $project: {
          processingHours: {
            $divide: [
              { $subtract: ['$qcDate', '$createdAt'] },
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
        typeBreakdown: typeStats,
        processingTime: processingTimeStats[0] || {
          avgProcessingHours: 0,
          minProcessingHours: 0,
          maxProcessingHours: 0
        }
      }
    });

  } catch (error) {
    console.error('Get QC statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch QC statistics' });
  }
};

export default {
  createQCFromInvoice,
  getQCRecord,
  getQCRecords,
  updateItemQC,
  submitQCForApproval,
  approveRejectQC,
  approveQC,
  rejectQC,
  getQCDashboard,
  bulkAssignQC,
  getQCWorkload,
  getQCStatistics
};