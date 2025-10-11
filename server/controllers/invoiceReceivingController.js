// server/controllers/invoiceReceivingController.js - COMPLETE FIXED VERSION
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';
import pdfService from '../services/pdfService.js';

export const createInvoiceReceiving = async (req, res) => {
  try {
    console.log('=== CREATE INVOICE RECEIVING DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request files:', req.files);
    console.log('=====================================');
    
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
    
    // Comprehensive validation with detailed error messages
    const validationErrors = [];
    
    // Validate required fields
    if (!purchaseOrder) {
      validationErrors.push({ path: 'purchaseOrder', msg: 'Purchase order is required' });
    }
    
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      validationErrors.push({ path: 'invoiceNumber', msg: 'Invoice number is required' });
    }
    
    if (!invoiceDate) {
      validationErrors.push({ path: 'invoiceDate', msg: 'Invoice date is required' });
    }
    
    if (!receivedDate) {
      validationErrors.push({ path: 'receivedDate', msg: 'Received date is required' });
    }
    
    // Validate date formats
    if (invoiceDate && isNaN(Date.parse(invoiceDate))) {
      validationErrors.push({ path: 'invoiceDate', msg: 'Invalid invoice date format' });
    }
    
    if (receivedDate && isNaN(Date.parse(receivedDate))) {
      validationErrors.push({ path: 'receivedDate', msg: 'Invalid received date format' });
    }
    
    // Validate invoice date is not in the future
    if (invoiceDate && new Date(invoiceDate) > new Date()) {
      validationErrors.push({ path: 'invoiceDate', msg: 'Invoice date cannot be in the future' });
    }
    
    // Validate received date is not in the future
    if (receivedDate && new Date(receivedDate) > new Date()) {
      validationErrors.push({ path: 'receivedDate', msg: 'Received date cannot be in the future' });
    }
    
    console.log('Validation errors so far:', validationErrors);
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.log('Returning validation errors:', validationErrors);
      return res.status(400).json({ 
        message: 'Validation failed - please check the following fields',
        errors: validationErrors 
      });
    }
    
    // Validate PO exists and is in correct status
    const po = await PurchaseOrder.findById(purchaseOrder);
    if (!po) {
      return res.status(404).json({ 
        message: 'Purchase order not found',
        errors: [{ path: 'purchaseOrder', msg: 'The selected purchase order does not exist' }]
      });
    }
    
    if (!['ordered', 'partial_received', 'received'].includes(po.status)) {
      return res.status(400).json({ 
        message: 'Invalid purchase order status',
        errors: [{ 
          path: 'purchaseOrder', 
          msg: `Purchase order status is '${po.status}'. Only orders with status 'ordered', 'partial_received', or 'received' can be processed.` 
        }]
      });
    }
    
    // Parse products data - check both receivedProducts and products fields
    let productsArray = products || receivedProducts;
    if (typeof productsArray === 'string') {
      try {
        productsArray = JSON.parse(productsArray);
      } catch (e) {
        console.error('Error parsing products data:', e);
        return res.status(400).json({ 
          message: 'Invalid products data format',
          errors: [{ path: 'receivedProducts', msg: 'Products data must be valid JSON format' }]
        });
      }
    }
    
    console.log('Parsed productsArray:', productsArray);
    
    // Validate received products - allow zero quantities but require products array
    if (!productsArray || !Array.isArray(productsArray)) {
      return res.status(400).json({ 
        message: 'Products data is required',
        errors: [{ path: 'receivedProducts', msg: 'At least one product must be included in the receiving' }]
      });
    }
    
    if (productsArray.length === 0) {
      return res.status(400).json({ 
        message: 'Product list cannot be empty',
        errors: [{ path: 'receivedProducts', msg: 'At least one product must be selected for receiving' }]
      });
    }
    
    // Validate individual products
    const productValidationErrors = [];
    productsArray.forEach((product, index) => {
      if (!product.productName || product.productName.trim() === '') {
        productValidationErrors.push(`Product ${index + 1}: Product name is required`);
      }
      
      if (!product.productCode || product.productCode.trim() === '') {
        productValidationErrors.push(`Product ${index + 1}: Product code is required`);
      }
      
      const receivedQty = product.receivedQuantity || product.receivedQty || 0;
      if (receivedQty < 0) {
        productValidationErrors.push(`Product ${index + 1} (${product.productName}): Received quantity cannot be negative`);
      }
      
      const unitPrice = product.unitPrice || 0;
      if (unitPrice < 0) {
        productValidationErrors.push(`Product ${index + 1} (${product.productName}): Unit price cannot be negative`);
      }
      
      // Validate batch number if provided
      if (product.batchNo && product.batchNo.length > 50) {
        productValidationErrors.push(`Product ${index + 1} (${product.productName}): Batch number is too long (max 50 characters)`);
      }
      
      // Validate dates if provided
      if (product.mfgDate && isNaN(Date.parse(product.mfgDate))) {
        productValidationErrors.push(`Product ${index + 1} (${product.productName}): Invalid manufacturing date format`);
      }
      
      if (product.expDate && isNaN(Date.parse(product.expDate))) {
        productValidationErrors.push(`Product ${index + 1} (${product.productName}): Invalid expiry date format`);
      }
      
      // Validate expiry date is after manufacturing date
      if (product.mfgDate && product.expDate) {
        const mfgDate = new Date(product.mfgDate);
        const expDate = new Date(product.expDate);
        if (expDate <= mfgDate) {
          productValidationErrors.push(`Product ${index + 1} (${product.productName}): Expiry date must be after manufacturing date`);
        }
      }
    });
    
    if (productValidationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Product validation errors found',
        errors: productValidationErrors.map(error => ({ msg: error }))
      });
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
    const quantityValidationErrors = [];
    
    // Group products by product ID to handle batch-based receiving
    const productGroups = {};
    productsArray.forEach(product => {
      const productId = product.product?.toString();
      if (!productId) return;
      
      if (!productGroups[productId]) {
        productGroups[productId] = {
          productName: product.productName,
          totalNewReceiving: 0,
          batches: []
        };
      }
      
      const receivedQty = product.receivedQuantity || product.receivedQty || 0;
      productGroups[productId].totalNewReceiving += receivedQty;
      productGroups[productId].batches.push({
        batchNumber: product.batchNumber || product.batchNo || 'N/A',
        quantity: receivedQty
      });
    });
    
    // Validate each product group
    Object.keys(productGroups).forEach(productId => {
      const productGroup = productGroups[productId];
      
      // Find the corresponding product in the PO
      const poProduct = po.products.find(p => p.product?.toString() === productId);
      if (!poProduct) {
        quantityValidationErrors.push(`Product ${productGroup.productName} not found in purchase order`);
        hasValidationErrors = true;
        return;
      }
      
      // Calculate total that would be received after this receiving
      const alreadyReceived = cumulativeReceived[productId] || 0;
      const newReceiving = productGroup.totalNewReceiving;
      const totalAfterReceiving = alreadyReceived + newReceiving;
      const orderedQty = poProduct.quantity;
      
      console.log(`Product ${productGroup.productName}: Ordered=${orderedQty}, Already Received=${alreadyReceived}, New Receiving=${newReceiving} (across ${productGroup.batches.length} batches), Total After=${totalAfterReceiving}`);
      
      // Allow up to 10% over-receiving tolerance
      const tolerance = 0.1;
      const maxAllowed = orderedQty * (1 + tolerance);
      
      if (totalAfterReceiving > maxAllowed) {
        quantityValidationErrors.push(
          `Product ${productGroup.productName}: Total received (${totalAfterReceiving}) would exceed ordered quantity (${orderedQty}) by more than ${tolerance * 100}%`
        );
        hasValidationErrors = true;
      }
    });
    
    if (hasValidationErrors) {
      return res.status(400).json({ 
        message: 'Quantity validation errors found',
        errors: quantityValidationErrors.map(error => ({ msg: error }))
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
      
      // Parse document types and custom document types from request body
      let documentTypes = [];
      let customDocumentTypes = [];
      
      if (req.body.documentTypes) {
        try {
          documentTypes = typeof req.body.documentTypes === 'string' 
            ? JSON.parse(req.body.documentTypes) 
            : req.body.documentTypes;
        } catch (e) {
          console.error('Error parsing documentTypes:', e);
        }
      }
      
      if (req.body.customDocumentTypes) {
        try {
          customDocumentTypes = typeof req.body.customDocumentTypes === 'string' 
            ? JSON.parse(req.body.customDocumentTypes) 
            : req.body.customDocumentTypes;
        } catch (e) {
          console.error('Error parsing customDocumentTypes:', e);
        }
      }
      
      // Add new documents to existing ones
      const newDocuments = documentFiles.map((file, index) => {
        const docType = documentTypes[index];
        const customType = customDocumentTypes[index];
        
        return {
          name: file.originalname,
          type: docType === 'Other' ? customType : docType, // Use custom type if "Other" is selected
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: req.user._id,
          uploadedAt: new Date()
        };
      });
      
      // Append new documents to existing ones
      invoiceReceiving.documents = [...(invoiceReceiving.documents || []), ...newDocuments];
    }
    
    // Update other fields from request body
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'products' && key !== 'receivedProducts' && req.body[key] !== undefined) {
        invoiceReceiving[key] = req.body[key];
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
    
    console.log('Retrieved invoice receiving data:', JSON.stringify(invoiceReceiving, null, 2));
    
    // Transform the data to match frontend expectations
    const transformedReceiving = {
      ...invoiceReceiving,
      receivedProducts: invoiceReceiving.products, // Map products to receivedProducts for frontend
      supplier: invoiceReceiving.purchaseOrder?.supplier || 'Unknown Supplier',
      // Ensure Additional Information fields are included
      notes: invoiceReceiving.notes || '',
      qcRequired: invoiceReceiving.qcRequired !== undefined ? invoiceReceiving.qcRequired : true
    };
    
    console.log('Transformed receiving data:', JSON.stringify(transformedReceiving, null, 2));
    
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
      const updateValidationErrors = [];
      
      // Group products by product ID to handle batch-based receiving
      const productGroups = {};
      productsArray.forEach(product => {
        const productId = product.product?.toString();
        if (!productId) return;
        
        if (!productGroups[productId]) {
          productGroups[productId] = {
            productName: product.productName,
            totalNewReceiving: 0,
            batches: []
          };
        }
        
        const receivedQty = product.receivedQuantity || product.receivedQty || 0;
        productGroups[productId].totalNewReceiving += receivedQty;
        productGroups[productId].batches.push({
          batchNumber: product.batchNumber || product.batchNo || 'N/A',
          quantity: receivedQty
        });
      });
      
      // Validate each product group
      Object.keys(productGroups).forEach(productId => {
        const productGroup = productGroups[productId];
        
        const poProduct = po.products.find(p => p.product?.toString() === productId);
        if (!poProduct) {
          updateValidationErrors.push(`Product ${productGroup.productName} not found in purchase order`);
          hasValidationErrors = true;
          return;
        }
        
        const alreadyReceived = cumulativeReceived[productId] || 0;
        const newReceiving = productGroup.totalNewReceiving;
        const totalAfterReceiving = alreadyReceived + newReceiving;
        const orderedQty = poProduct.quantity;
        
        // Allow up to 10% over-receiving tolerance
        const tolerance = 0.1;
        const maxAllowed = orderedQty * (1 + tolerance);
        
        if (totalAfterReceiving > maxAllowed) {
          updateValidationErrors.push(
            `Product ${productGroup.productName}: Total received (${totalAfterReceiving}) would exceed ordered quantity (${orderedQty}) by more than ${tolerance * 100}%`
          );
          hasValidationErrors = true;
        }
      });
      
      if (hasValidationErrors) {
        return res.status(400).json({ 
          message: 'Validation errors found',
          errors: updateValidationErrors 
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
    
    // Handle document uploads if any
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      // Parse document types and custom document types from request body
      let documentTypes = [];
      let customDocumentTypes = [];
      
      if (req.body.documentTypes) {
        try {
          documentTypes = typeof req.body.documentTypes === 'string' 
            ? JSON.parse(req.body.documentTypes) 
            : req.body.documentTypes;
        } catch (e) {
          console.error('Error parsing documentTypes:', e);
        }
      }
      
      if (req.body.customDocumentTypes) {
        try {
          customDocumentTypes = typeof req.body.customDocumentTypes === 'string' 
            ? JSON.parse(req.body.customDocumentTypes) 
            : req.body.customDocumentTypes;
        } catch (e) {
          console.error('Error parsing customDocumentTypes:', e);
        }
      }
      
      // Add new documents to existing ones
      const newDocuments = documentFiles.map((file, index) => {
        const docType = documentTypes[index];
        const customType = customDocumentTypes[index];
        
        return {
          name: file.originalname,
          type: docType === 'Other' ? customType : docType, // Use custom type if "Other" is selected
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: req.user._id,
          uploadedAt: new Date()
        };
      });
      
      // Append new documents to existing ones
      invoiceReceiving.documents = [...(invoiceReceiving.documents || []), ...newDocuments];
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
      
      // Populate related fields and transform data like getInvoiceReceiving does
      const populatedReceiving = await InvoiceReceiving.findById(id)
        .populate('purchaseOrder', 'poNumber status supplier')
        .populate('receivedBy', 'name email')
        .populate('qcBy', 'name email')
        .lean();
      
      // Transform the data to match frontend expectations
      const transformedReceiving = {
        ...populatedReceiving,
        receivedProducts: populatedReceiving.products, // Map products to receivedProducts for frontend
        supplier: populatedReceiving.purchaseOrder?.supplier || 'Unknown Supplier',
        notes: populatedReceiving.notes || '',
        qcRequired: populatedReceiving.qcRequired !== undefined ? populatedReceiving.qcRequired : true
      };
      
      res.json({
        message: 'Product QC status updated successfully',
        data: transformedReceiving
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
// In server/controllers/invoiceReceivingController.js

export const downloadInvoiceReceivingPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('=== PDF Download Request ===');
    console.log('Invoice Receiving ID:', id);
    
    // Get invoice receiving with all related data
    const invoiceReceiving = await InvoiceReceiving.findById(id)
      .populate({
        path: 'purchaseOrder',
        select: 'poNumber poDate principal',
        populate: {
          path: 'principal',
          select: 'name email mobile'
        }
      })
      .populate('receivedBy', 'name email')
      .lean();

    if (!invoiceReceiving) {
      console.error('Invoice receiving not found:', id);
      return res.status(404).json({ message: 'Invoice receiving not found' });
    }

    console.log('Invoice receiving found:', {
      invoiceNumber: invoiceReceiving.invoiceNumber,
      productsCount: invoiceReceiving.products?.length || 0,
      documentsCount: invoiceReceiving.documents?.length || 0
    });

    // Safely extract supplier info
    const supplierName = invoiceReceiving.supplier || 
                        invoiceReceiving.purchaseOrder?.principal?.name || 
                        'N/A';
    
    const supplierAddress = invoiceReceiving.purchaseOrder?.principal?.address || 'N/A';

    // Prepare data for PDF generation
    const pdfData = {
      invoiceNumber: invoiceReceiving.invoiceNumber || 'N/A',
      invoiceDate: invoiceReceiving.invoiceDate,
      receivedDate: invoiceReceiving.receivedDate,
      status: invoiceReceiving.status || 'draft',
      supplierName: supplierName,
      supplierAddress: supplierAddress,
      totalAmount: invoiceReceiving.invoiceAmount || 0,
      taxAmount: 0, // Calculate if you have tax info
      grandTotal: invoiceReceiving.invoiceAmount || 0,
      purchaseOrder: invoiceReceiving.purchaseOrder ? {
        poNumber: invoiceReceiving.purchaseOrder.poNumber || 'N/A',
        poDate: invoiceReceiving.purchaseOrder.poDate
      } : null,
      products: (invoiceReceiving.products || []).map(product => ({
        productName: product.productName || 'N/A',
        categoryName: product.categoryName || 'General',
        quantity: product.receivedQty || 0,
        unit: product.unit || 'PCS',
        unitPrice: product.unitPrice || 0,
        taxPercentage: 0,
        totalAmount: (product.receivedQty || 0) * (product.unitPrice || 0)
      })),
      documents: (invoiceReceiving.documents || []).map(doc => ({
        originalName: doc.originalName || doc.name || 'Document',
        filename: doc.filename || '',
        size: doc.size || 0
      }))
    };

    console.log('PDF data prepared:', {
      invoiceNumber: pdfData.invoiceNumber,
      productsCount: pdfData.products.length,
      documentsCount: pdfData.documents.length
    });

    // Check if pdfService is available
    if (!pdfService || typeof pdfService.generateInvoiceReceivingPDF !== 'function') {
      console.error('PDF service not available');
      return res.status(500).json({ 
        message: 'PDF service not initialized',
        error: 'PDF generation service is not available'
      });
    }

    console.log('Calling PDF service...');

    // Generate PDF with timeout
    const pdfBuffer = await Promise.race([
      pdfService.generateInvoiceReceivingPDF(pdfData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), 30000)
      )
    ]);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    console.log('PDF generated successfully:', {
      bufferSize: pdfBuffer.length,
      sizeInKB: (pdfBuffer.length / 1024).toFixed(2)
    });

    // Set response headers for PDF download
    const filename = `invoice-receiving-${invoiceReceiving.invoiceNumber || id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    console.log('Sending PDF response...');

    // Send PDF buffer
    res.send(pdfBuffer);

    console.log('PDF sent successfully');

  } catch (error) {
    console.error('=== PDF Generation Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Send appropriate error response
    res.status(500).json({ 
      message: 'Failed to generate PDF',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        type: error.constructor.name
      } : undefined
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