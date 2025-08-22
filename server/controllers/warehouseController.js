// server/controllers/warehouseController.js
import Warehouse from '../models/Warehouse.js';
import Branch from '../models/Branch.js';
import BranchContact from '../models/BranchContact.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', branchId = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { warehouseCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (branchId) {
      query.branch = branchId;
    }
    
    const warehouses = await Warehouse.find(query)
      .populate('branch', 'name branchCode')
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Warehouse.countDocuments(query);
    
    res.json({
      warehouses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouses' });
  }
};

export const getWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const warehouse = await Warehouse.findById(id)
      .populate('branch', 'name branchCode')
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email');
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    // Get warehouse contacts
    const contacts = await BranchContact.getWarehouseContacts(id);
    
    res.json({
      warehouse,
      contacts,
    });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouse' });
  }
};

export const createWarehouse = async (req, res) => {
  try {
    const {
      branch,
      name,
      warehouseCode,
      email,
      phone,
      alternatePhone,
      address,
      drugLicenseNumber,
      district,
      state,
      pincode,
      status,
      remarks
    } = req.body;

    // Verify branch exists
    const branchDoc = await Branch.findById(branch);
    if (!branchDoc) {
      return res.status(400).json({ message: 'Branch not found' });
    }

    const warehouse = new Warehouse({
      branch,
      name,
      warehouseCode,
      email,
      phone,
      alternatePhone,
      address,
      drugLicenseNumber,
      district,
      state,
      pincode,
      status: status || 'Active',
      remarks,
      createdBy: req.user.id,
    });

    // Handle document uploads
    if (req.files && req.files.length > 0) {
      const documents = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentName: req.body[`documentName_${file.fieldname}`] || file.originalname,
        validityStartDate: req.body[`validityStartDate_${file.fieldname}`],
        validityEndDate: req.body[`validityEndDate_${file.fieldname}`],
        uploadedBy: req.user.id,
      }));
      warehouse.documents = documents;
    }

    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('branch', 'name branchCode')
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('documents.uploadedBy', 'name email');

    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads/warehouse-documents', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to create warehouse' });
  }
};

export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      warehouseCode,
      email,
      phone,
      alternatePhone,
      address,
      drugLicenseNumber,
      district,
      state,
      pincode,
      status,
      remarks,
      isActive
    } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Update warehouse fields
    warehouse.name = name || warehouse.name;
    warehouse.warehouseCode = warehouseCode;
    warehouse.email = email || warehouse.email;
    warehouse.phone = phone || warehouse.phone;
    warehouse.alternatePhone = alternatePhone;
    warehouse.address = address || warehouse.address;
    warehouse.drugLicenseNumber = drugLicenseNumber || warehouse.drugLicenseNumber;
    warehouse.district = district || warehouse.district;
    warehouse.state = state || warehouse.state;
    warehouse.pincode = pincode || warehouse.pincode;
    warehouse.status = status || warehouse.status;
    warehouse.remarks = remarks;
    warehouse.isActive = isActive !== undefined ? isActive : warehouse.isActive;
    warehouse.updatedBy = req.user.id;

    // Handle new document uploads
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentName: req.body[`documentName_${file.fieldname}`] || file.originalname,
        validityStartDate: req.body[`validityStartDate_${file.fieldname}`],
        validityEndDate: req.body[`validityEndDate_${file.fieldname}`],
        uploadedBy: req.user.id,
      }));
      warehouse.documents.push(...newDocuments);
    }

    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('branch', 'name branchCode')
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email');

    res.json({
      message: 'Warehouse updated successfully',
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads/warehouse-documents', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to update warehouse' });
  }
};

export const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Delete associated contacts
    await BranchContact.deleteMany({ warehouse: id });

    // Delete warehouse documents from filesystem
    if (warehouse.documents && warehouse.documents.length > 0) {
      warehouse.documents.forEach(doc => {
        const filePath = path.join(__dirname, '../uploads/warehouse-documents', doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await Warehouse.findByIdAndDelete(id);

    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ message: 'Failed to delete warehouse' });
  }
};

// Document management methods
export const addWarehouseDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, validityStartDate, validityEndDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const documentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      documentName,
      validityStartDate,
      validityEndDate,
      uploadedBy: req.user.id,
    };

    await warehouse.addDocument(documentData);

    const populatedWarehouse = await Warehouse.findById(id)
      .populate('documents.uploadedBy', 'name email');

    res.json({
      message: 'Document added successfully',
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error('Add warehouse document error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/warehouse-documents', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ message: 'Failed to add document' });
  }
};

export const updateWarehouseDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { documentName, validityStartDate, validityEndDate } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const updateData = {
      documentName,
      validityStartDate,
      validityEndDate,
    };

    await warehouse.updateDocument(documentId, updateData);

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Update warehouse document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

export const deleteWarehouseDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const document = warehouse.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads/warehouse-documents', document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await warehouse.removeDocument(documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete warehouse document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Contact management methods
export const getWarehouseContacts = async (req, res) => {
  try {
    const { id } = req.params;

    const contacts = await BranchContact.getWarehouseContacts(id);

    res.json({ contacts });
  } catch (error) {
    console.error('Get warehouse contacts error:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

export const createWarehouseContact = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contactPersonName,
      department,
      designation,
      contactNumber,
      alternateContactPerson,
      emailAddress
    } = req.body;

    const warehouse = await Warehouse.findById(id).populate('branch');
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const contact = new BranchContact({
      branch: warehouse.branch._id,
      warehouse: id,
      contactPersonName,
      department,
      designation,
      contactNumber,
      alternateContactPerson,
      emailAddress,
      createdBy: req.user.id,
    });

    await contact.save();

    const populatedContact = await BranchContact.findById(contact._id)
      .populate('branch', 'name branchCode')
      .populate('warehouse', 'name warehouseCode')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Contact created successfully',
      contact: populatedContact,
    });
  } catch (error) {
    console.error('Create warehouse contact error:', error);
    res.status(500).json({ message: 'Failed to create contact' });
  }
};

// Get warehouses by branch
export const getWarehousesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    let query = { branch: branchId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { warehouseCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }
    
    const warehouses = await Warehouse.find(query)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Warehouse.countDocuments(query);
    
    res.json({
      warehouses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get warehouses by branch error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouses' });
  }
};