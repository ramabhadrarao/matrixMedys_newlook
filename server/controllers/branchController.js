// server/controllers/branchController.js
import Branch from '../models/Branch.js';
import Warehouse from '../models/Warehouse.js';
import BranchContact from '../models/BranchContact.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getBranches = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { branchCode: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ]
    } : {};
    
    const branches = await Branch.find(query)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Branch.countDocuments(query);
    
    res.json({
      branches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
};

export const getBranch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const branch = await Branch.findById(id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email');
    
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Get branch warehouses
    const warehouses = await Warehouse.find({ branch: id })
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
    
    // Get branch contacts
    const contacts = await BranchContact.getAllBranchContacts(id);
    
    res.json({
      branch,
      warehouses,
      contacts,
    });
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({ message: 'Failed to fetch branch' });
  }
};

export const createBranch = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      alternatePhone,
      branchCode,
      drugLicenseNumber,
      gstNumber,
      panNumber,
      gstAddress,
      city,
      state,
      pincode,
      remarks
    } = req.body;

    // Check if GST number already exists
    const existingGST = await Branch.findOne({ gstNumber });
    if (existingGST) {
      return res.status(400).json({ message: 'GST number already exists' });
    }

    // Check if PAN number already exists
    const existingPAN = await Branch.findOne({ panNumber });
    if (existingPAN) {
      return res.status(400).json({ message: 'PAN number already exists' });
    }

    const branch = new Branch({
      name,
      email,
      phone,
      alternatePhone,
      branchCode,
      drugLicenseNumber,
      gstNumber: gstNumber.toUpperCase(),
      panNumber: panNumber.toUpperCase(),
      gstAddress,
      city,
      state,
      pincode,
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
      branch.documents = documents;
    }

    await branch.save();

    const populatedBranch = await Branch.findById(branch._id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('documents.uploadedBy', 'name email');

    res.status(201).json({
      message: 'Branch created successfully',
      branch: populatedBranch,
    });
  } catch (error) {
    console.error('Create branch error:', error);
    
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads/branch-documents', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    
    res.status(500).json({ message: 'Failed to create branch' });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      alternatePhone,
      branchCode,
      drugLicenseNumber,
      gstNumber,
      panNumber,
      gstAddress,
      city,
      state,
      pincode,
      remarks,
      isActive
    } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if GST number already exists (excluding current branch)
    if (gstNumber && gstNumber !== branch.gstNumber) {
      const existingGST = await Branch.findOne({ gstNumber, _id: { $ne: id } });
      if (existingGST) {
        return res.status(400).json({ message: 'GST number already exists' });
      }
    }

    // Check if PAN number already exists (excluding current branch)
    if (panNumber && panNumber !== branch.panNumber) {
      const existingPAN = await Branch.findOne({ panNumber, _id: { $ne: id } });
      if (existingPAN) {
        return res.status(400).json({ message: 'PAN number already exists' });
      }
    }

    // Update branch fields
    branch.name = name || branch.name;
    branch.email = email || branch.email;
    branch.phone = phone || branch.phone;
    branch.alternatePhone = alternatePhone;
    branch.branchCode = branchCode;
    branch.drugLicenseNumber = drugLicenseNumber || branch.drugLicenseNumber;
    branch.gstNumber = gstNumber ? gstNumber.toUpperCase() : branch.gstNumber;
    branch.panNumber = panNumber ? panNumber.toUpperCase() : branch.panNumber;
    branch.gstAddress = gstAddress || branch.gstAddress;
    branch.city = city || branch.city;
    branch.state = state || branch.state;
    branch.pincode = pincode || branch.pincode;
    branch.remarks = remarks;
    branch.isActive = isActive !== undefined ? isActive : branch.isActive;
    branch.updatedBy = req.user.id;

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
      branch.documents.push(...newDocuments);
    }

    await branch.save();

    const populatedBranch = await Branch.findById(branch._id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email');

    res.json({
      message: 'Branch updated successfully',
      branch: populatedBranch,
    });
  } catch (error) {
    console.error('Update branch error:', error);
    
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads/branch-documents', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    
    res.status(500).json({ message: 'Failed to update branch' });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if branch has warehouses
    const warehouseCount = await Warehouse.countDocuments({ branch: id });
    if (warehouseCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete branch with existing warehouses. Please delete warehouses first.' 
      });
    }

    // Delete associated contacts
    await BranchContact.deleteMany({ branch: id });

    // Delete branch documents from filesystem
    if (branch.documents && branch.documents.length > 0) {
      branch.documents.forEach(doc => {
        const filePath = path.join(__dirname, '../uploads/branch-documents', doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await Branch.findByIdAndDelete(id);

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ message: 'Failed to delete branch' });
  }
};

// Document management methods
export const addBranchDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, validityStartDate, validityEndDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
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

    await branch.addDocument(documentData);

    const populatedBranch = await Branch.findById(id)
      .populate('documents.uploadedBy', 'name email');

    res.json({
      message: 'Document added successfully',
      branch: populatedBranch,
    });
  } catch (error) {
    console.error('Add branch document error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/branch-documents', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ message: 'Failed to add document' });
  }
};

export const updateBranchDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { documentName, validityStartDate, validityEndDate } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const updateData = {
      documentName,
      validityStartDate,
      validityEndDate,
    };

    await branch.updateDocument(documentId, updateData);

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Update branch document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

export const deleteBranchDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const document = branch.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads/branch-documents', document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await branch.removeDocument(documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete branch document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Contact management methods
export const getBranchContacts = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'all' } = req.query; // 'branch', 'warehouse', or 'all'

    let contacts;
    if (type === 'branch') {
      contacts = await BranchContact.getBranchContacts(id);
    } else if (type === 'warehouse') {
      // This would need a warehouse ID, but for now return empty
      contacts = [];
    } else {
      contacts = await BranchContact.getAllBranchContacts(id);
    }

    res.json({ contacts });
  } catch (error) {
    console.error('Get branch contacts error:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

export const createBranchContact = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      warehouse,
      contactPersonName,
      department,
      designation,
      contactNumber,
      alternateContactPerson,
      emailAddress
    } = req.body;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // If warehouse is specified, verify it belongs to this branch
    if (warehouse) {
      const warehouseDoc = await Warehouse.findOne({ _id: warehouse, branch: id });
      if (!warehouseDoc) {
        return res.status(400).json({ message: 'Warehouse not found or does not belong to this branch' });
      }
    }

    const contact = new BranchContact({
      branch: id,
      warehouse: warehouse || null,
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
    console.error('Create branch contact error:', error);
    res.status(500).json({ message: 'Failed to create contact' });
  }
};

export const updateBranchContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const {
      contactPersonName,
      department,
      designation,
      contactNumber,
      alternateContactPerson,
      emailAddress,
      isActive
    } = req.body;

    const contact = await BranchContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    contact.contactPersonName = contactPersonName || contact.contactPersonName;
    contact.department = department || contact.department;
    contact.designation = designation || contact.designation;
    contact.contactNumber = contactNumber || contact.contactNumber;
    contact.alternateContactPerson = alternateContactPerson;
    contact.emailAddress = emailAddress || contact.emailAddress;
    contact.isActive = isActive !== undefined ? isActive : contact.isActive;
    contact.updatedBy = req.user.id;

    await contact.save();

    const populatedContact = await BranchContact.findById(contact._id)
      .populate('branch', 'name branchCode')
      .populate('warehouse', 'name warehouseCode')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({
      message: 'Contact updated successfully',
      contact: populatedContact,
    });
  } catch (error) {
    console.error('Update branch contact error:', error);
    res.status(500).json({ message: 'Failed to update contact' });
  }
};

export const deleteBranchContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await BranchContact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    await BranchContact.findByIdAndDelete(contactId);

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete branch contact error:', error);
    res.status(500).json({ message: 'Failed to delete contact' });
  }
};