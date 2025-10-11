// server/controllers/inventoryController.js
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

// Get inventory records with filtering and pagination
export const getInventoryRecords = async (req, res) => {
  try {
    const {
      warehouse,
      product,
      stockStatus,
      expiryStatus,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      lowStock = false,
      nearExpiry = false
    } = req.query;

    let query = { isActive: true };

    // Filters
    if (warehouse) query.warehouse = warehouse;
    if (product) query.product = product;
    if (stockStatus) query.stockStatus = stockStatus;

    // Search functionality
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { batchNo: { $regex: search, $options: 'i' } }
      ];
    }

    // Low stock filter
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$availableStock', '$minimumStock'] };
    }

    // Near expiry filter (next 30 days)
    if (nearExpiry === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }

    // Expiry status filter
    if (expiryStatus) {
      const today = new Date();
      switch (expiryStatus) {
        case 'expired':
          query.expDate = { $lt: today };
          break;
        case 'near_expiry':
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);
          query.expDate = { $gte: today, $lte: thirtyDays };
          break;
        case 'expiring_soon':
          const ninetyDays = new Date();
          ninetyDays.setDate(ninetyDays.getDate() + 90);
          query.expDate = { $gte: today, $lte: ninetyDays };
          break;
        case 'good':
          const ninetyDaysGood = new Date();
          ninetyDaysGood.setDate(ninetyDaysGood.getDate() + 90);
          query.expDate = { $gt: ninetyDaysGood };
          break;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const inventoryRecords = await Inventory.find(query)
      .populate('product', 'name code category')
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await Inventory.countDocuments(query);

    // Add computed fields
    const enrichedRecords = inventoryRecords.map(record => {
      const recordObj = record.toObject({ virtuals: true });
      return {
        ...recordObj,
        needsReorder: record.needsReorder(),
        stockValue: record.stockValue,
        daysUntilExpiry: record.daysUntilExpiry,
        expiryStatus: record.expiryStatus
      };
    });

    res.json({
      data: {
        inventoryRecords: enrichedRecords,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get inventory records error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory records' });
  }
};

// Get single inventory record with complete history
export const getInventoryRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const inventoryRecord = await Inventory.findById(id)
      .populate('product', 'name code category description')
      .populate('warehouse', 'name location contactInfo')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('stockMovements.movementBy', 'name email')
      .populate('reservations.reservedBy', 'name email')
      .populate('alerts.acknowledgedBy', 'name email')
      .populate('productHistory.purchaseOrder.supplier', 'name')
      .populate('productHistory.invoiceReceiving.receivedBy', 'name email')
      .populate('productHistory.qualityControl.qcBy', 'name email')
      .populate('productHistory.warehouseApproval.warehouseApprovedBy', 'name email')
      .populate('productHistory.utilization.hospital', 'name')
      .populate('productHistory.utilization.doctor', 'name')
      .populate('productHistory.utilization.utilizationBy', 'name email');

    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    // Add computed fields
    const recordObj = inventoryRecord.toObject({ virtuals: true });
    const enrichedRecord = {
      ...recordObj,
      needsReorder: inventoryRecord.needsReorder(),
      stockValue: inventoryRecord.stockValue,
      daysUntilExpiry: inventoryRecord.daysUntilExpiry,
      expiryStatus: inventoryRecord.expiryStatus,
      productJourney: inventoryRecord.getProductJourney()
    };

    res.json({ data: enrichedRecord });

  } catch (error) {
    console.error('Get inventory record error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory record' });
  }
};

// Update inventory record
export const updateInventoryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    // Restricted fields that cannot be updated directly
    const restrictedFields = [
      'currentStock', 'availableStock', 'totalValue', 'stockMovements', 
      'productHistory', 'createdBy', 'createdAt'
    ];

    // Remove restricted fields from updates
    restrictedFields.forEach(field => delete updates[field]);

    // Update allowed fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        inventoryRecord[key] = updates[key];
      }
    });

    inventoryRecord.updatedBy = req.user._id;
    await inventoryRecord.save();

    res.json({
      message: 'Inventory record updated successfully',
      data: inventoryRecord
    });

  } catch (error) {
    console.error('Update inventory record error:', error);
    res.status(500).json({ message: 'Failed to update inventory record' });
  }
};

// Stock adjustment (add/remove stock)
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustmentType, quantity, reason, remarks } = req.body;

    if (!['add', 'remove'].includes(adjustmentType)) {
      return res.status(400).json({ message: 'Invalid adjustment type' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    const movementData = {
      reason: reason || `Stock ${adjustmentType}`,
      remarks: remarks || '',
      movementBy: req.user._id,
      referenceType: 'adjustment_note'
    };

    if (adjustmentType === 'add') {
      await inventoryRecord.addStock(quantity, movementData);
    } else {
      await inventoryRecord.removeStock(quantity, movementData);
    }

    res.json({
      message: `Stock ${adjustmentType}ed successfully`,
      data: {
        currentStock: inventoryRecord.currentStock,
        availableStock: inventoryRecord.availableStock,
        totalValue: inventoryRecord.totalValue
      }
    });

  } catch (error) {
    console.error('Stock adjustment error:', error);
    if (error.message === 'Insufficient stock available') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to adjust stock' });
  }
};

// Reserve stock
export const reserveStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      reservedFor, 
      reservedQty, 
      expiryDate, 
      referenceId, 
      referenceNumber, 
      remarks 
    } = req.body;

    if (!reservedQty || reservedQty <= 0) {
      return res.status(400).json({ message: 'Reserved quantity must be greater than 0' });
    }

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    const reservationData = {
      reservedFor,
      reservedBy: req.user._id,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      referenceId,
      referenceNumber,
      remarks
    };

    await inventoryRecord.reserveStock(reservedQty, reservationData);

    res.json({
      message: 'Stock reserved successfully',
      data: {
        reservedStock: inventoryRecord.reservedStock,
        availableStock: inventoryRecord.availableStock
      }
    });

  } catch (error) {
    console.error('Reserve stock error:', error);
    if (error.message === 'Insufficient stock available for reservation') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to reserve stock' });
  }
};

// Release stock reservation
export const releaseReservation = async (req, res) => {
  try {
    const { id, reservationId } = req.params;

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    await inventoryRecord.releaseReservation(reservationId);

    res.json({
      message: 'Reservation released successfully',
      data: {
        reservedStock: inventoryRecord.reservedStock,
        availableStock: inventoryRecord.availableStock
      }
    });

  } catch (error) {
    console.error('Release reservation error:', error);
    res.status(500).json({ message: 'Failed to release reservation' });
  }
};

// Transfer stock between locations
export const transferStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      quantity, 
      toWarehouse, 
      toLocation, 
      reason, 
      remarks,
      referenceNumber 
    } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    if (inventoryRecord.availableStock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available for transfer' });
    }

    // Remove stock from current location
    const outwardMovement = {
      movementType: 'transfer',
      quantity: quantity,
      fromLocation: {
        warehouse: inventoryRecord.warehouse,
        zone: inventoryRecord.location.zone,
        rack: inventoryRecord.location.rack,
        shelf: inventoryRecord.location.shelf,
        bin: inventoryRecord.location.bin
      },
      toLocation: {
        warehouse: toWarehouse,
        ...toLocation
      },
      reason: reason || 'Stock transfer',
      remarks: remarks || '',
      movementBy: req.user._id,
      referenceType: 'transfer_order',
      referenceNumber: referenceNumber
    };

    await inventoryRecord.removeStock(quantity, outwardMovement);

    // Create new inventory record at destination (if different warehouse)
    if (toWarehouse && toWarehouse.toString() !== inventoryRecord.warehouse.toString()) {
      const newInventoryRecord = new Inventory({
        product: inventoryRecord.product,
        productCode: inventoryRecord.productCode,
        productName: inventoryRecord.productName,
        batchNo: inventoryRecord.batchNo,
        mfgDate: inventoryRecord.mfgDate,
        expDate: inventoryRecord.expDate,
        warehouse: toWarehouse,
        location: toLocation,
        currentStock: quantity,
        availableStock: quantity,
        unitCost: inventoryRecord.unitCost,
        totalValue: quantity * inventoryRecord.unitCost,
        storageConditions: inventoryRecord.storageConditions,
        productHistory: inventoryRecord.productHistory,
        stockMovements: [{
          movementType: 'inward',
          quantity: quantity,
          fromLocation: {
            warehouse: inventoryRecord.warehouse,
            zone: inventoryRecord.location.zone,
            rack: inventoryRecord.location.rack,
            shelf: inventoryRecord.location.shelf,
            bin: inventoryRecord.location.bin
          },
          reason: reason || 'Stock transfer',
          remarks: remarks || '',
          movementBy: req.user._id,
          referenceType: 'transfer_order',
          referenceNumber: referenceNumber
        }],
        createdBy: req.user._id
      });

      await newInventoryRecord.save();
    } else {
      // Update location within same warehouse
      inventoryRecord.location = { ...inventoryRecord.location, ...toLocation };
      await inventoryRecord.save();
    }

    res.json({
      message: 'Stock transferred successfully',
      data: {
        currentStock: inventoryRecord.currentStock,
        availableStock: inventoryRecord.availableStock
      }
    });

  } catch (error) {
    console.error('Transfer stock error:', error);
    res.status(500).json({ message: 'Failed to transfer stock' });
  }
};

// Record stock utilization (to hospital/patient)
export const recordUtilization = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantity,
      hospital,
      hospitalName,
      caseNumber,
      patient,
      patientName,
      patientId,
      doctor,
      doctorName,
      utilizationReason,
      remarks
    } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    // Remove stock
    const movementData = {
      toLocation: { hospital },
      reason: utilizationReason || 'Patient utilization',
      remarks: remarks || '',
      movementBy: req.user._id,
      referenceType: 'hospital_requisition'
    };

    await inventoryRecord.removeStock(quantity, movementData);

    // Add to utilization history
    const utilizationRecord = {
      hospital,
      hospitalName,
      caseNumber,
      patient,
      patientName,
      patientId,
      doctor,
      doctorName,
      utilizationDate: new Date(),
      utilizationQty: quantity,
      utilizationReason,
      utilizationBy: req.user._id,
      utilizationRemarks: remarks
    };

    inventoryRecord.productHistory.utilization.push(utilizationRecord);
    await inventoryRecord.save();

    res.json({
      message: 'Utilization recorded successfully',
      data: {
        currentStock: inventoryRecord.currentStock,
        availableStock: inventoryRecord.availableStock,
        utilizationHistory: inventoryRecord.productHistory.utilization
      }
    });

  } catch (error) {
    console.error('Record utilization error:', error);
    if (error.message === 'Insufficient stock available') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to record utilization' });
  }
};

// Get inventory statistics
export const getInventoryStatistics = async (req, res) => {
  try {
    const { warehouse, dateFrom, dateTo } = req.query;

    let query = { isActive: true };
    if (warehouse) query.warehouse = warehouse;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    // Total inventory value
    const totalValue = await Inventory.aggregate([
      { $match: { ...query, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalValue' },
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' }
        }
      }
    ]);

    // Stock status breakdown
    const stockStatusStats = await Inventory.aggregate([
      { $match: { ...query, ...dateFilter } },
      {
        $group: {
          _id: '$stockStatus',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);

    // Low stock items
    const lowStockItems = await Inventory.aggregate([
      { 
        $match: { 
          ...query, 
          ...dateFilter,
          $expr: { $lte: ['$availableStock', '$minimumStock'] }
        } 
      },
      { $count: 'count' }
    ]);

    // Near expiry items (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const nearExpiryItems = await Inventory.aggregate([
      { 
        $match: { 
          ...query, 
          ...dateFilter,
          expDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
        } 
      },
      { $count: 'count' }
    ]);

    // Expired items
    const expiredItems = await Inventory.aggregate([
      { 
        $match: { 
          ...query, 
          ...dateFilter,
          expDate: { $lt: new Date() }
        } 
      },
      { $count: 'count' }
    ]);

    // Top products by value
    const topProductsByValue = await Inventory.aggregate([
      { $match: { ...query, ...dateFilter } },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          totalValue: { $sum: '$totalValue' },
          totalStock: { $sum: '$currentStock' }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 }
    ]);

    // Warehouse-wise breakdown
    const warehouseStats = await Inventory.aggregate([
      { $match: { ...query, ...dateFilter } },
      {
        $group: {
          _id: '$warehouse',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouseInfo'
        }
      },
      {
        $project: {
          warehouseName: { $arrayElemAt: ['$warehouseInfo.name', 0] },
          totalItems: 1,
          totalStock: 1,
          totalValue: 1
        }
      }
    ]);

    res.json({
      data: {
        overview: totalValue[0] || { totalValue: 0, totalItems: 0, totalStock: 0 },
        stockStatusBreakdown: stockStatusStats,
        alerts: {
          lowStock: lowStockItems[0]?.count || 0,
          nearExpiry: nearExpiryItems[0]?.count || 0,
          expired: expiredItems[0]?.count || 0
        },
        topProductsByValue,
        warehouseBreakdown: warehouseStats
      }
    });

  } catch (error) {
    console.error('Get inventory statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory statistics' });
  }
};

// Get stock movement history
export const getStockMovementHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const inventoryRecord = await Inventory.findById(id);
    if (!inventoryRecord) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get paginated stock movements
    const movements = inventoryRecord.stockMovements
      .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate))
      .slice(skip, skip + parseInt(limit));

    // Populate movement by user
    await Inventory.populate(movements, {
      path: 'movementBy',
      select: 'name email'
    });

    const totalCount = inventoryRecord.stockMovements.length;

    res.json({
      data: {
        movements,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get stock movement history error:', error);
    res.status(500).json({ message: 'Failed to fetch stock movement history' });
  }
};

// Get inventory dashboard statistics
export const getInventoryDashboard = async (req, res) => {
  try {
    const { timeframe = '30', warehouse } = req.query;
    
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(timeframe));
    
    let matchFilter = { isActive: true, createdAt: { $gte: dateFilter } };
    if (warehouse) {
      matchFilter.warehouse = warehouse;
    }

    // Get inventory statistics
    const stats = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalStock: { $sum: '$currentStock' },
          availableStock: { $sum: '$availableStock' },
          reservedStock: { $sum: '$reservedStock' },
          lowStockItems: { 
            $sum: { 
              $cond: [{ $lte: ['$availableStock', '$minimumStock'] }, 1, 0] 
            } 
          },
          outOfStockItems: { 
            $sum: { 
              $cond: [{ $eq: ['$availableStock', 0] }, 1, 0] 
            } 
          },
          nearExpiryItems: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$expDate', { $add: [new Date(), 30 * 24 * 60 * 60 * 1000] }] },
                    { $gte: ['$expDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          expiredItems: {
            $sum: {
              $cond: [{ $lt: ['$expDate', new Date()] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get recent stock movements
    const recentMovements = await Inventory.find(matchFilter)
      .populate('warehouse', 'name')
      .populate('stockMovements.movementBy', 'name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('productName productCode currentStock stockMovements warehouse');

    // Get top products by value
    const topProductsByValue = await Inventory.find(matchFilter)
      .populate('warehouse', 'name')
      .sort({ totalValue: -1 })
      .limit(10)
      .select('productName productCode currentStock totalValue warehouse');

    // Get warehouse distribution
    const warehouseDistribution = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$warehouse',
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalStock: { $sum: '$currentStock' }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          warehouseName: '$warehouse.name',
          totalItems: 1,
          totalValue: 1,
          totalStock: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        statistics: stats[0] || {
          totalItems: 0,
          totalValue: 0,
          totalStock: 0,
          availableStock: 0,
          reservedStock: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          nearExpiryItems: 0,
          expiredItems: 0
        },
        recentMovements,
        topProductsByValue,
        warehouseDistribution
      }
    });

  } catch (error) {
    console.error('Get inventory dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory dashboard data',
      error: error.message 
    });
  }
};

// Bulk update inventory records
export const bulkUpdateInventory = async (req, res) => {
  try {
    const { inventoryIds, updateData } = req.body;

    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return res.status(400).json({ message: 'Inventory IDs array is required' });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Update data is required' });
    }

    // Validate allowed fields for bulk update
    const allowedFields = ['minimumStock', 'maximumStock', 'reorderLevel', 'storageConditions', 'location'];
    const updateFields = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.updatedBy = req.user._id;
    updateFields.updatedAt = new Date();

    const result = await Inventory.updateMany(
      { _id: { $in: inventoryIds }, isActive: true },
      { $set: updateFields }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} inventory records updated successfully`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Bulk update inventory error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update inventory records',
      error: error.message 
    });
  }
};

// Get inventory alerts (low stock, near expiry, expired)
export const getInventoryAlerts = async (req, res) => {
  try {
    const { warehouse, alertType = 'all' } = req.query;

    let matchFilter = { isActive: true };
    if (warehouse) {
      matchFilter.warehouse = warehouse;
    }

    const alerts = {
      lowStock: [],
      outOfStock: [],
      nearExpiry: [],
      expired: []
    };

    // Low stock alerts
    if (alertType === 'all' || alertType === 'low_stock') {
      alerts.lowStock = await Inventory.find({
        ...matchFilter,
        $expr: { $lte: ['$availableStock', '$minimumStock'] },
        availableStock: { $gt: 0 }
      })
      .populate('warehouse', 'name')
      .select('productName productCode availableStock minimumStock warehouse')
      .sort({ availableStock: 1 });
    }

    // Out of stock alerts
    if (alertType === 'all' || alertType === 'out_of_stock') {
      alerts.outOfStock = await Inventory.find({
        ...matchFilter,
        availableStock: 0
      })
      .populate('warehouse', 'name')
      .select('productName productCode availableStock warehouse')
      .sort({ updatedAt: -1 });
    }

    // Near expiry alerts (next 30 days)
    if (alertType === 'all' || alertType === 'near_expiry') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      alerts.nearExpiry = await Inventory.find({
        ...matchFilter,
        expDate: { $lte: thirtyDaysFromNow, $gte: new Date() },
        availableStock: { $gt: 0 }
      })
      .populate('warehouse', 'name')
      .select('productName productCode expDate availableStock warehouse')
      .sort({ expDate: 1 });
    }

    // Expired items
    if (alertType === 'all' || alertType === 'expired') {
      alerts.expired = await Inventory.find({
        ...matchFilter,
        expDate: { $lt: new Date() },
        availableStock: { $gt: 0 }
      })
      .populate('warehouse', 'name')
      .select('productName productCode expDate availableStock warehouse')
      .sort({ expDate: 1 });
    }

    // Calculate alert counts
    const alertCounts = {
      lowStock: alerts.lowStock.length,
      outOfStock: alerts.outOfStock.length,
      nearExpiry: alerts.nearExpiry.length,
      expired: alerts.expired.length,
      total: alerts.lowStock.length + alerts.outOfStock.length + alerts.nearExpiry.length + alerts.expired.length
    };

    res.json({
      success: true,
      data: {
        alerts,
        counts: alertCounts
      }
    });

  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory alerts',
      error: error.message 
    });
  }
};

// Get inventory valuation report
export const getInventoryValuation = async (req, res) => {
  try {
    const { warehouse, category, dateFrom, dateTo } = req.query;

    let matchFilter = { isActive: true };
    if (warehouse) {
      matchFilter.warehouse = warehouse;
    }

    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) matchFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchFilter.createdAt.$lte = new Date(dateTo);
    }

    // Get valuation by warehouse
    const warehouseValuation = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$warehouse',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' },
          availableValue: { $sum: { $multiply: ['$availableStock', '$unitCost'] } },
          reservedValue: { $sum: { $multiply: ['$reservedStock', '$unitCost'] } }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          warehouseName: '$warehouse.name',
          totalItems: 1,
          totalStock: 1,
          totalValue: 1,
          availableValue: 1,
          reservedValue: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Get valuation by product category (if products have categories)
    const categoryValuation = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$productInfo.category',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' }
        }
      },
      {
        $project: {
          category: { $ifNull: ['$_id', 'Uncategorized'] },
          totalItems: 1,
          totalStock: 1,
          totalValue: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Get overall totals
    const overallTotals = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: '$totalValue' },
          availableStock: { $sum: '$availableStock' },
          availableValue: { $sum: { $multiply: ['$availableStock', '$unitCost'] } },
          reservedStock: { $sum: '$reservedStock' },
          reservedValue: { $sum: { $multiply: ['$reservedStock', '$unitCost'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overallTotals: overallTotals[0] || {
          totalItems: 0,
          totalStock: 0,
          totalValue: 0,
          availableStock: 0,
          availableValue: 0,
          reservedStock: 0,
          reservedValue: 0
        },
        warehouseValuation,
        categoryValuation
      }
    });

  } catch (error) {
    console.error('Get inventory valuation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory valuation',
      error: error.message 
    });
  }
};

export default {
  getInventoryRecords,
  getInventoryRecord,
  updateInventoryRecord,
  adjustStock,
  reserveStock,
  releaseReservation,
  transferStock,
  recordUtilization,
  getInventoryStatistics,
  getStockMovementHistory
};