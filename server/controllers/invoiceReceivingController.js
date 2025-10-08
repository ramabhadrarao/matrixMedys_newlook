// server/controllers/invoiceReceivingController.js - COMPLETE FIXED VERSION
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';
import pdfService from '../services/pdfService.js';

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
    
    if (!['ordered', 'partial_received', 'received'].includes(po.status)) {
      return res.status(400).json({ 
        message: 'Purchase order must be in ordered, partial_received, or received status' 
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
      return res.status(400).json({ message: 'Product list cannot be empty' });
    }
    
    // Get all existing invoice receivings for this PO (excluding draft status)
    const existingReceivings = await InvoiceReceiving.find({
      purchaseOrder,
      status: { $in: ['submitted', 'completed', 'qc_pending'] }
    });
    
    // Calculate cumulative received quantities for validation
    const cumulativeReceived = {};
    existingReceivings.forEach(receiving => {
      receiving.products?.forEach(product => {
        const productId = product.product?.toString();
        if (productId) {
          cumulativeReceived[productId] = (cumulativeReceived[productId] || 0) + (product.receivedQty || 0);
        }
      });
    });
    
    // Validate that new receiving doesn't exceed ordered quantities
    let hasValidationErrors = false;
    const validationErrors = [];
    
    productsArray.forEach(product => {
      const productId = product.product?.toString();
      if (!productId) return;
      
      // Find the corresponding product in the PO
      const poProduct = po.products.find(p => p.product?.toString() === productId);
      if (!poProduct) {
        validationErrors.push(`Product ${product.productName} not found in purchase order`);
        hasValidationErrors = true;
        return;
      }
      
      // Calculate total that would be received after this receiving
      const alreadyReceived = cumulativeReceived[productId] || 0;
      const newReceiving = product.receivedQuantity || product.receivedQty || 0;
      const totalAfterReceiving = alreadyReceived + newReceiving;
      const orderedQty = poProduct.quantity;
      
      console.log(`Product ${product.productName}: Ordered=${orderedQty}, Already Received=${alreadyReceived}, New Receiving=${newReceiving}, Total After=${totalAfterReceiving}`);
      
      // Allow up to 10% over-receiving tolerance
      const tolerance = 0.1;
      const maxAllowed = orderedQty * (1 + tolerance);
      
      if (totalAfterReceiving > maxAllowed) {
        validationErrors.push(
          `Product ${product.productName}: Total received (${totalAfterReceiving}) would exceed ordered quantity (${orderedQty}) by more than ${tolerance * 100}%`
        );
        hasValidationErrors = true;
      }
    });
    
    if (hasValidationErrors) {
      return res.status(400).json({ 
        message: 'Validation errors found',
        errors: validationErrors 
      });
    }
    
    // Log zero received quantities for business tracking
    const zeroReceivedProducts = productsArray.filter(p => (p.receivedQuantity || p.receivedQty || 0) === 0);
    if (zeroReceivedProducts.length > 0) {
      console.log(`Invoice receiving with ${zeroReceivedProducts.length} zero-received products:`, 
        zeroReceivedProducts.map(p => p.productName || p.productCode).join(', '));
    }
    
    // Calculate invoice amount if not provided
    let calculatedInvoiceAmount = invoiceAmount;
    if (!calculatedInvoiceAmount || calculatedInvoiceAmount === 0) {
      calculatedInvoiceAmount = productsArray.reduce((total, product) => {
        const receivedQty = product.receivedQuantity || product.receivedQty || 0;
        const unitPrice = product.unitPrice || 0;
        return total + (receivedQty * unitPrice);
      }, 0);
      console.log('Calculated invoice amount:', calculatedInvoiceAmount);
    }
    
    const invoiceReceiving = new InvoiceReceiving({
      purchaseOrder,
      invoiceNumber,
      invoiceDate,
      invoiceAmount: calculatedInvoiceAmount,
      dueDate,
      receivedDate: receivedDate || new Date(),
      receivedBy: req.user._id,
      products: productsArray.map((product, index) => ({
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
        qcRemarks: '',
        productImages: [] // Initialize empty array for product images
      })),
      documents: [],
      notes: notes || '',
      qcRequired,
      status: 'draft',
      createdBy: req.user._id
    });

    // Handle product images if any
    if (req.files && req.files.productImages) {
      const productImageFiles = Array.isArray(req.files.productImages) 
        ? req.files.productImages 
        : [req.files.productImages];
      
      // Parse product image mappings from request body
      const productImageMappings = req.body.productImageMappings ? 
        JSON.parse(req.body.productImageMappings) : [];
      
      // Group images by product index
      const imagesByProduct = {};
      productImageFiles.forEach((file, fileIndex) => {
        const mapping = productImageMappings[fileIndex];
        if (mapping && mapping.productIndex !== undefined) {
          const productIndex = mapping.productIndex;
          if (!imagesByProduct[productIndex]) {
            imagesByProduct[productIndex] = [];
          }
          imagesByProduct[productIndex].push({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
        }
      });
      
      // Assign images to products (max 10 per product)
      Object.keys(imagesByProduct).forEach(productIndex => {
        const index = parseInt(productIndex);
        if (invoiceReceiving.products[index]) {
          invoiceReceiving.products[index].productImages = imagesByProduct[productIndex].slice(0, 10);
        }
      });
    }
    
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
    
    // Update PO with received quantities (considering all receivings)
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
      .populate('qcBy', 'name email')
      .lean();
    
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    // Transform the data to match frontend expectations
    const transformedReceiving = {
      ...invoiceReceiving,
      receivedProducts: invoiceReceiving.products, // Map products to receivedProducts for frontend
      supplier: invoiceReceiving.purchaseOrder?.supplier || 'Unknown Supplier'
    };
    
    res.json({ data: transformedReceiving });
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
      .skip(skip)
      .lean(); // Use lean for better performance
    
    // Transform the data to match frontend expectations
    const transformedReceivings = invoiceReceivings.map(receiving => ({
      ...receiving,
      receivedProducts: receiving.products, // Map products to receivedProducts for frontend
      supplier: receiving.purchaseOrder?.supplier || 'Unknown Supplier'
    }));
    
    const totalCount = await InvoiceReceiving.countDocuments(query);
    
    res.json({ 
      data: {
        invoiceReceivings: transformedReceivings,
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
    
    // Parse receivedProducts/products if it's a string (from FormData)
    let productsArray = updates.products || updates.receivedProducts;
    if (productsArray && typeof productsArray === 'string') {
      try {
        productsArray = JSON.parse(productsArray);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid products data format' });
      }
    }
    
    // If products are being updated, validate them
    if (productsArray) {
      const po = await PurchaseOrder.findById(invoiceReceiving.purchaseOrder);
      if (!po) {
        return res.status(404).json({ message: 'Associated purchase order not found' });
      }
      
      // Get all existing invoice receivings except current one
      const existingReceivings = await InvoiceReceiving.find({
        purchaseOrder: invoiceReceiving.purchaseOrder,
        _id: { $ne: id },
        status: { $in: ['submitted', 'completed', 'qc_pending'] }
      });
      
      // Calculate cumulative received quantities (excluding current receiving)
      const cumulativeReceived = {};
      existingReceivings.forEach(receiving => {
        receiving.products?.forEach(product => {
          const productId = product.product?.toString();
          if (productId) {
            cumulativeReceived[productId] = (cumulativeReceived[productId] || 0) + (product.receivedQty || 0);
          }
        });
      });
      
      // Validate updated quantities
      let hasValidationErrors = false;
      const validationErrors = [];
      
      productsArray.forEach(product => {
        const productId = product.product?.toString();
        if (!productId) return;
        
        const poProduct = po.products.find(p => p.product?.toString() === productId);
        if (!poProduct) {
          validationErrors.push(`Product ${product.productName} not found in purchase order`);
          hasValidationErrors = true;
          return;
        }
        
        const alreadyReceived = cumulativeReceived[productId] || 0;
        const newReceiving = product.receivedQuantity || product.receivedQty || 0;
        const totalAfterReceiving = alreadyReceived + newReceiving;
        const orderedQty = poProduct.quantity;
        
        // Allow up to 10% over-receiving tolerance
        const tolerance = 0.1;
        const maxAllowed = orderedQty * (1 + tolerance);
        
        if (totalAfterReceiving > maxAllowed) {
          validationErrors.push(
            `Product ${product.productName}: Total received (${totalAfterReceiving}) would exceed ordered quantity (${orderedQty}) by more than ${tolerance * 100}%`
          );
          hasValidationErrors = true;
        }
      });
      
      if (hasValidationErrors) {
        return res.status(400).json({ 
          message: 'Validation errors found',
          errors: validationErrors 
        });
      }
      
      // Update products
      invoiceReceiving.products = productsArray.map((product, index) => ({
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
        qcStatus: product.qcStatus || (invoiceReceiving.qcRequired ? 'pending' : 'not_required'),
        qcRemarks: product.qcRemarks || '',
        productImages: product.productImages || [] // Preserve existing images or initialize empty
      }));
      
      // Handle product images if any
      if (req.files && req.files.productImages) {
        const productImageFiles = Array.isArray(req.files.productImages) 
          ? req.files.productImages 
          : [req.files.productImages];
        
        // Parse product image mappings from request body
        const productImageMappings = req.body.productImageMappings ? 
          JSON.parse(req.body.productImageMappings) : [];
        
        // Group images by product index
        const imagesByProduct = {};
        productImageFiles.forEach((file, fileIndex) => {
          const mapping = productImageMappings[fileIndex];
          if (mapping && mapping.productIndex !== undefined) {
            const productIndex = mapping.productIndex;
            if (!imagesByProduct[productIndex]) {
              imagesByProduct[productIndex] = [];
            }
            imagesByProduct[productIndex].push({
              filename: file.filename,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              uploadedBy: req.user._id,
              uploadedAt: new Date()
            });
          }
        });
        
        // Add new images to products (max 10 per product)
        Object.keys(imagesByProduct).forEach(productIndex => {
          const index = parseInt(productIndex);
          if (invoiceReceiving.products[index]) {
            const existingImages = invoiceReceiving.products[index].productImages || [];
            const newImages = imagesByProduct[productIndex];
            const totalImages = [...existingImages, ...newImages].slice(0, 10);
            invoiceReceiving.products[index].productImages = totalImages;
          }
        });
      }
    }
    
    // Update other fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'products' && key !== 'receivedProducts' && updates[key] !== undefined) {
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
    await updatePOReceivedQuantities(invoiceReceiving.purchaseOrder._id || invoiceReceiving.purchaseOrder);
    
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
      invoiceReceiving.products.forEach(product => {
        if (!product.qcStatus || product.qcStatus === 'not_required') {
          product.qcStatus = 'pending';
        }
      });
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
    
    // Update PO received quantities
    await updatePOReceivedQuantities(invoiceReceiving.purchaseOrder._id || invoiceReceiving.purchaseOrder);
    
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
        const product = invoiceReceiving.products.find(p => 
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
      invoiceReceiving.products.forEach(product => {
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
        if (qcStatus === 'passed') {
          await updatePOReceivedQuantities(po._id);
          
          if (po.isFullyReceived) {
            const completedStage = await WorkflowStage.findOne({ code: 'COMPLETED' });
            if (completedStage) {
              po.currentStage = completedStage._id;
              po.status = 'completed';
            }
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

export const updateQCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIndex, qcStatus, qcRemarks, qcBy, qcDate } = req.body;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    if (productIndex >= 0 && productIndex < invoiceReceiving.products.length) {
      const product = invoiceReceiving.products[productIndex];
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

export const deleteInvoiceReceiving = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceReceiving = await InvoiceReceiving.findById(id);
    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }
    
    // Only allow deletion of draft status
    if (invoiceReceiving.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Can only delete draft invoice receivings' 
      });
    }
    
    const poId = invoiceReceiving.purchaseOrder;
    
    await InvoiceReceiving.findByIdAndDelete(id);
    
    // Update PO received quantities after deletion
    if (poId) {
      await updatePOReceivedQuantities(poId);
    }
    
    res.json({ message: 'Invoice receiving deleted successfully' });
  } catch (error) {
    console.error('Delete invoice receiving error:', error);
    res.status(500).json({ message: 'Failed to delete invoice receiving' });
  }
};

// Helper function to update PO received quantities - FIXED VERSION
const updatePOReceivedQuantities = async (purchaseOrderId) => {
  try {
    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) return;
    
    // Get all invoice receivings for this PO (include draft status for immediate updates)
    const invoiceReceivings = await InvoiceReceiving.find({ 
      purchaseOrder: purchaseOrderId,
      status: { $in: ['draft', 'submitted', 'completed', 'qc_pending'] }
    });
    
    // Calculate total received quantities per product
    const receivedQuantities = {};
    
    invoiceReceivings.forEach(receiving => {
      receiving.products?.forEach(product => {
        const productId = product.product?.toString();
        if (productId) {
          if (!receivedQuantities[productId]) {
            receivedQuantities[productId] = 0;
          }
          receivedQuantities[productId] += product.receivedQty || 0;
        }
      });
    });
    
    // Update PO products with received quantities
    let allFullyReceived = true;
    let someReceived = false;
    
    po.products.forEach(product => {
      const productId = product.product?.toString();
      if (productId) {
        const receivedQty = receivedQuantities[productId] || 0;
        
        product.receivedQty = receivedQty;
        product.backlogQty = Math.max(0, product.quantity - receivedQty);
        
        if (receivedQty > 0) {
          someReceived = true;
        }
        
        if (product.backlogQty > 0) {
          allFullyReceived = false;
        }
      }
    });
    
    // Update PO status based on received quantities
    if (allFullyReceived && someReceived) {
      po.status = 'received';
      po.isFullyReceived = true;
      // Find and set appropriate workflow stage
      const receivedStage = await WorkflowStage.findOne({ code: 'RECEIVED' });
      if (receivedStage) {
        po.currentStage = receivedStage._id;
      }
    } else if (someReceived) {
      po.status = 'partial_received';
      po.isFullyReceived = false;
      const partialReceivedStage = await WorkflowStage.findOne({ code: 'PARTIAL_RECEIVED' });
      if (partialReceivedStage) {
        po.currentStage = partialReceivedStage._id;
      }
    } else {
      // No items received yet, keep current status (likely 'ordered')
      po.isFullyReceived = false;
    }
    
    po.updatedAt = new Date();
    
    await po.save();
    
    console.log(`Updated PO ${po.poNumber} - Status: ${po.status}, Fully Received: ${allFullyReceived}`);
  } catch (error) {
    console.error('Error updating PO received quantities:', error);
  }
};

// Download invoice receiving as PDF
export const downloadInvoiceReceivingPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice receiving with all related data
    const invoiceReceiving = await InvoiceReceiving.findById(id)
      .populate({
        path: 'purchaseOrder',
        populate: [
          { path: 'principal', select: 'name address' },
          { path: 'products.product', select: 'name category unit' },
          { path: 'products.product.category', select: 'name' }
        ]
      })
      .populate('products.product')
      .populate('products.product.category');

    if (!invoiceReceiving) {
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }

    // Prepare data for PDF generation
    const pdfData = {
      invoiceNumber: invoiceReceiving.invoiceNumber,
      invoiceDate: invoiceReceiving.invoiceDate,
      receivedDate: invoiceReceiving.receivedDate,
      status: invoiceReceiving.status,
      supplierName: invoiceReceiving.purchaseOrder?.principal?.name || 'N/A',
      supplierAddress: invoiceReceiving.purchaseOrder?.principal?.address || 'N/A',
      totalAmount: invoiceReceiving.invoiceAmount || 0,
      taxAmount: invoiceReceiving.taxAmount || 0,
      grandTotal: invoiceReceiving.grandTotal || invoiceReceiving.invoiceAmount || 0,
      purchaseOrder: {
        poNumber: invoiceReceiving.purchaseOrder?.poNumber,
        poDate: invoiceReceiving.purchaseOrder?.poDate
      },
      products: invoiceReceiving.products?.map(product => ({
        productName: product.product?.name || product.productName || 'N/A',
        categoryName: product.product?.category?.name || product.categoryName || 'N/A',
        quantity: product.receivedQty || product.quantity || 0,
        unit: product.product?.unit || product.unit || 'N/A',
        unitPrice: product.unitPrice || 0,
        taxPercentage: product.taxPercentage || 0,
        totalAmount: product.totalAmount || (product.unitPrice * product.quantity) || 0
      })) || [],
      documents: invoiceReceiving.documents || []
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateInvoiceReceivingPDF(pdfData);

    // Set response headers for PDF download
    const filename = `invoice-receiving-${invoiceReceiving.invoiceNumber || id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      message: 'Failed to generate PDF', 
      error: error.message 
    });
  }
};

export default {
  createInvoiceReceiving,
  getInvoiceReceiving,
  getInvoiceReceivings,
  updateInvoiceReceiving,
  submitToQC,
  performQCCheck,
  updateQCStatus,
  deleteInvoiceReceiving,
  downloadInvoiceReceivingPDF
};