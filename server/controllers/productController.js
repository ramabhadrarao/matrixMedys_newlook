import Product from '../models/Product.js';
import Category from '../models/Category.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all products
export const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category,
      principal,
      portfolio,
      includeSubcategories = false
    } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { specification: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (principal) {
      query.principal = principal;
    }
    
    if (portfolio) {
      query.portfolio = portfolio;
    }
    
    if (category) {
      if (includeSubcategories === 'true') {
        const cat = await Category.findById(category);
        if (cat) {
          const descendants = await cat.getDescendants();
          const categoryIds = [category, ...descendants.map(d => d._id)];
          query.category = { $in: categoryIds };
        }
      } else {
        query.category = category;
      }
    }
    
    const products = await Product.find(query)
      .populate('category', 'name path')
      .populate('principal', 'name')
      .populate('portfolio', 'name')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .populate('category')
      .populate('principal', 'name')
      .populate('portfolio', 'name')
      .populate('categoryAncestors', 'name')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get category breadcrumb
    let breadcrumb = '';
    if (product.category) {
      breadcrumb = await product.category.getFullPath();
    }
    
    res.json({
      product,
      breadcrumb
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    console.log('Create product request body:', req.body);
    console.log('Request files:', req.files);
    
    let {
      name,
      code,
      category,
      gstPercentage,
      specification,
      remarks,
      unit,
      hsnCode,
      barcode
    } = req.body;
    
    // Validate required fields
    if (!name || !code || !category || gstPercentage === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          !name && { param: 'name', msg: 'Name is required' },
          !code && { param: 'code', msg: 'Code is required' },
          !category && { param: 'category', msg: 'Category is required' },
          gstPercentage === undefined && { param: 'gstPercentage', msg: 'GST percentage is required' }
        ].filter(Boolean)
      });
    }
    
    // Check if product code already exists
    const existingProduct = await Product.findOne({ code: code.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({ 
        message: 'Product with this code already exists',
        errors: [{ param: 'code', msg: 'Product code already exists' }]
      });
    }
    
    // Validate category exists
    const categoryDoc = await Category.findById(category)
      .populate('principal')
      .populate('portfolio');
    
    if (!categoryDoc) {
      return res.status(400).json({ 
        message: 'Invalid category',
        errors: [{ param: 'category', msg: 'Category not found' }]
      });
    }
    
    const productData = {
      name,
      code: code.toUpperCase(),
      category,
      principal: categoryDoc.principal._id,
      portfolio: categoryDoc.portfolio._id,
      categoryPath: await categoryDoc.getFullPath(),
      categoryAncestors: categoryDoc.ancestors,
      gstPercentage: parseFloat(gstPercentage),
      specification,
      remarks,
      unit: unit || 'PCS',
      hsnCode,
      barcode,
      createdBy: req.user._id,
      documents: []
    };
    
    // Handle file uploads
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      const documentNames = req.body.documentNames ? 
        (Array.isArray(req.body.documentNames) ? req.body.documentNames : [req.body.documentNames]) : 
        [];
      
      productData.documents = documentFiles.map((file, index) => ({
        name: documentNames[index] || file.originalname,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
    }
    
    const product = new Product(productData);
    await product.save();
    await product.populate('category', 'name');
    await product.populate('principal', 'name');
    await product.populate('portfolio', 'name');
    await product.populate('createdBy', 'name email');
    await product.populate('documents.uploadedBy', 'name email');
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Clean up uploaded files if product creation fails
    if (req.files && req.files.documents) {
      const files = Array.isArray(req.files.documents) ? req.files.documents : [req.files.documents];
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      code,
      category,
      gstPercentage,
      specification,
      remarks,
      unit,
      hsnCode,
      barcode,
      isActive
    } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if code already exists (excluding current product)
    if (code && code !== product.code) {
      const existingProduct = await Product.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: id } 
      });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product with this code already exists' });
      }
    }
    
    // If category is changing, validate and update related fields
    if (category && category !== product.category.toString()) {
      const categoryDoc = await Category.findById(category)
        .populate('principal')
        .populate('portfolio');
      
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      
      product.category = category;
      product.principal = categoryDoc.principal._id;
      product.portfolio = categoryDoc.portfolio._id;
      product.categoryPath = await categoryDoc.getFullPath();
      product.categoryAncestors = categoryDoc.ancestors;
    }
    
    // Update other fields
    product.name = name;
    product.code = code.toUpperCase();
    product.gstPercentage = parseFloat(gstPercentage);
    product.specification = specification;
    product.remarks = remarks;
    product.unit = unit || product.unit;
    product.hsnCode = hsnCode;
    product.barcode = barcode;
    product.isActive = isActive;
    product.updatedBy = req.user._id;
    
    // Handle new file uploads
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      const documentNames = req.body.documentNames ? 
        (Array.isArray(req.body.documentNames) ? req.body.documentNames : [req.body.documentNames]) : 
        [];
      
      const newDocuments = documentFiles.map((file, index) => ({
        name: documentNames[index] || file.originalname,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
      
      product.documents.push(...newDocuments);
    }
    
    await product.save();
    await product.populate('category', 'name');
    await product.populate('principal', 'name');
    await product.populate('portfolio', 'name');
    await product.populate('createdBy', 'name email');
    await product.populate('updatedBy', 'name email');
    await product.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Clean up uploaded files if update fails
    if (req.files && req.files.documents) {
      const files = Array.isArray(req.files.documents) ? req.files.documents : [req.files.documents];
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to update product' });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete all associated files
    if (product.documents && product.documents.length > 0) {
      product.documents.forEach(document => {
        const filePath = path.join(__dirname, '../uploads/product-documents', document.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting product document:', deleteError);
        }
      });
    }
    
    await Product.findByIdAndDelete(id);
    
    // Update category's product count
    if (product.category) {
      const count = await Product.countDocuments({ category: product.category });
      await Category.findByIdAndUpdate(product.category, {
        productsCount: count
      });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// Add document to product
export const addProductDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const documentData = {
      name: name || req.file.originalname,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };
    
    await product.addDocument(documentData);
    await product.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Document added successfully',
      document: product.documents[product.documents.length - 1]
    });
  } catch (error) {
    console.error('Add product document error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Failed to add document' });
  }
};

// Delete product document
export const deleteProductDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const document = product.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/product-documents', document.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
    
    // Remove document from array
    await product.removeDocument(documentId);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete product document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Get products by category (including subcategories)
export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { includeSubcategories = true } = req.query;
    
    let categoryIds = [categoryId];
    
    if (includeSubcategories === 'true') {
      const category = await Category.findById(categoryId);
      if (category) {
        const descendants = await category.getDescendants();
        categoryIds = [categoryId, ...descendants.map(d => d._id)];
      }
    }
    
    const products = await Product.find({
      category: { $in: categoryIds },
      isActive: true
    })
    .populate('category', 'name')
    .sort({ name: 1 });
    
    res.json({ products });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};