// server/controllers/principalController.js
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';
import State from '../models/State.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getPrincipals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', portfolio = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (portfolio) {
      query.portfolio = { $in: [portfolio] };
    }
    
    const principals = await Principal.find(query)
      .populate('portfolio', 'name description')
      .populate('addresses.state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('contactPersons.portfolio', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Principal.countDocuments(query);
    
    res.json({
      principals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get principals error:', error);
    res.status(500).json({ message: 'Failed to fetch principals' });
  }
};

export const getPrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const principal = await Principal.findById(id)
      .populate('portfolio', 'name description')
      .populate('addresses.state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('documents.uploadedBy', 'name email')
      .populate('contactPersons.portfolio', 'name');
    
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    res.json({
      principal,
    });
  } catch (error) {
    console.error('Get principal error:', error);
    res.status(500).json({ message: 'Failed to fetch principal' });
  }
};

export const createPrincipal = async (req, res) => {
  try {
    console.log('Create principal request body:', req.body);
    console.log('Request files:', req.files);
    
    let {
      name,
      email,
      mobile,
      gstNumber,
      panNumber,
      portfolio,
      addresses,
      contactPersons
    } = req.body;
    
    // Handle form data arrays
    if (typeof portfolio === 'string') {
      portfolio = [portfolio];
    } else if (!Array.isArray(portfolio)) {
      portfolio = [];
    }
    
    // Parse JSON fields if they come as strings
    if (typeof addresses === 'string') {
      try {
        addresses = JSON.parse(addresses);
      } catch (e) {
        addresses = [];
      }
    }
    
    if (typeof contactPersons === 'string') {
      try {
        contactPersons = JSON.parse(contactPersons);
      } catch (e) {
        contactPersons = [];
      }
    }
    
    // Validate required fields
    if (!name || !email || !mobile || !gstNumber || !panNumber) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          !name && { param: 'name', msg: 'Name is required' },
          !email && { param: 'email', msg: 'Email is required' },
          !mobile && { param: 'mobile', msg: 'Mobile is required' },
          !gstNumber && { param: 'gstNumber', msg: 'GST number is required' },
          !panNumber && { param: 'panNumber', msg: 'PAN number is required' }
        ].filter(Boolean)
      });
    }
    
    // Check if email already exists
    const existingEmail = await Principal.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Principal with this email already exists',
        errors: [{ param: 'email', msg: 'Email already exists' }]
      });
    }
    
    // Check if GST number already exists
    const existingGST = await Principal.findOne({ gstNumber });
    if (existingGST) {
      return res.status(400).json({ 
        message: 'Principal with this GST number already exists',
        errors: [{ param: 'gstNumber', msg: 'GST number already exists' }]
      });
    }
    
    // Check if PAN number already exists
    const existingPAN = await Principal.findOne({ panNumber });
    if (existingPAN) {
      return res.status(400).json({ 
        message: 'Principal with this PAN number already exists',
        errors: [{ param: 'panNumber', msg: 'PAN number already exists' }]
      });
    }
    
    // Validate portfolios exist
    if (!portfolio || portfolio.length === 0) {
      return res.status(400).json({ 
        message: 'At least one portfolio is required',
        errors: [{ param: 'portfolio', msg: 'At least one portfolio is required' }]
      });
    }
    
    const portfolios = await Portfolio.find({ _id: { $in: portfolio } });
    if (portfolios.length !== portfolio.length) {
      return res.status(400).json({ 
        message: 'Some portfolios are invalid',
        errors: [{ param: 'portfolio', msg: 'Invalid portfolio IDs provided' }]
      });
    }
    
    // Validate addresses states exist
    if (addresses && addresses.length > 0) {
      const stateIds = addresses.map(addr => addr.state).filter(Boolean);
      const states = await State.find({ _id: { $in: stateIds } });
      if (states.length !== stateIds.length) {
        return res.status(400).json({ 
          message: 'Some states in addresses are invalid',
          errors: [{ param: 'addresses', msg: 'Invalid state IDs in addresses' }]
        });
      }
    }
    
    // Validate contact persons portfolios if provided
    if (contactPersons && contactPersons.length > 0) {
      const contactPortfolioIds = contactPersons
        .map(contact => contact.portfolio)
        .filter(Boolean);
      
      if (contactPortfolioIds.length > 0) {
        const contactPortfolios = await Portfolio.find({ _id: { $in: contactPortfolioIds } });
        if (contactPortfolios.length !== contactPortfolioIds.length) {
          return res.status(400).json({ 
            message: 'Some portfolios in contact persons are invalid',
            errors: [{ param: 'contactPersons', msg: 'Invalid portfolio IDs in contact persons' }]
          });
        }
      }
    }
    
    const principalData = {
      name,
      email,
      mobile,
      gstNumber: gstNumber.toUpperCase(),
      panNumber: panNumber.toUpperCase(),
      portfolio: portfolio || [],
      addresses: addresses || [],
      contactPersons: contactPersons || [],
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
      
      const hasValidities = req.body.hasValidities ? 
        (Array.isArray(req.body.hasValidities) ? req.body.hasValidities : [req.body.hasValidities]) : 
        [];
      
      const startDates = req.body.startDates ? 
        (Array.isArray(req.body.startDates) ? req.body.startDates : [req.body.startDates]) : 
        [];
      
      const endDates = req.body.endDates ? 
        (Array.isArray(req.body.endDates) ? req.body.endDates : [req.body.endDates]) : 
        [];
      
      principalData.documents = documentFiles.map((file, index) => {
        const hasValidity = hasValidities[index] === 'true' || hasValidities[index] === true;
        return {
          name: documentNames[index] || file.originalname,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasValidity: hasValidity,
          startDate: hasValidity && startDates[index] ? new Date(startDates[index]) : undefined,
          endDate: hasValidity && endDates[index] ? new Date(endDates[index]) : undefined,
          uploadedAt: new Date(),
          uploadedBy: req.user._id
        };
      });
    }
    
    const principal = new Principal(principalData);
    await principal.save();
    await principal.populate('portfolio', 'name description');
    await principal.populate('addresses.state', 'name code');
    await principal.populate('createdBy', 'name email');
    await principal.populate('documents.uploadedBy', 'name email');
    await principal.populate('contactPersons.portfolio', 'name');
    
    res.status(201).json({
      message: 'Principal created successfully',
      principal,
    });
  } catch (error) {
    console.error('Create principal error:', error);
    
    // Clean up uploaded files if principal creation fails
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
    
    res.status(500).json({ message: 'Failed to create principal' });
  }
};

export const updatePrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      email,
      mobile,
      gstNumber,
      panNumber,
      portfolio,
      addresses,
      contactPersons,
      isActive
    } = req.body;
    
    // Handle form data arrays
    if (typeof portfolio === 'string') {
      portfolio = [portfolio];
    } else if (!Array.isArray(portfolio)) {
      portfolio = [];
    }
    
    // Parse JSON fields if they come as strings
    if (typeof addresses === 'string') {
      try {
        addresses = JSON.parse(addresses);
      } catch (e) {
        addresses = [];
      }
    }
    
    if (typeof contactPersons === 'string') {
      try {
        contactPersons = JSON.parse(contactPersons);
      } catch (e) {
        contactPersons = [];
      }
    }
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Check if email already exists (excluding current principal)
    if (email !== principal.email) {
      const existingEmail = await Principal.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Principal with this email already exists' });
      }
    }
    
    // Check if GST number already exists (excluding current principal)
    if (gstNumber !== principal.gstNumber) {
      const existingGST = await Principal.findOne({ gstNumber, _id: { $ne: id } });
      if (existingGST) {
        return res.status(400).json({ message: 'Principal with this GST number already exists' });
      }
    }
    
    // Check if PAN number already exists (excluding current principal)
    if (panNumber !== principal.panNumber) {
      const existingPAN = await Principal.findOne({ panNumber, _id: { $ne: id } });
      if (existingPAN) {
        return res.status(400).json({ message: 'Principal with this PAN number already exists' });
      }
    }
    
    // Validate portfolios exist
    if (!portfolio || portfolio.length === 0) {
      return res.status(400).json({ 
        message: 'At least one portfolio is required',
        errors: [{ param: 'portfolio', msg: 'At least one portfolio is required' }]
      });
    }
    
    const portfolios = await Portfolio.find({ _id: { $in: portfolio } });
    if (portfolios.length !== portfolio.length) {
      return res.status(400).json({ message: 'Some portfolios are invalid' });
    }
    
    // Validate contact persons portfolios if provided
    if (contactPersons && contactPersons.length > 0) {
      const contactPortfolioIds = contactPersons
        .map(contact => contact.portfolio)
        .filter(Boolean);
      
      if (contactPortfolioIds.length > 0) {
        const contactPortfolios = await Portfolio.find({ _id: { $in: contactPortfolioIds } });
        if (contactPortfolios.length !== contactPortfolioIds.length) {
          return res.status(400).json({ 
            message: 'Some portfolios in contact persons are invalid',
            errors: [{ param: 'contactPersons', msg: 'Invalid portfolio IDs in contact persons' }]
          });
        }
      }
    }
    
    // Update fields
    principal.name = name;
    principal.email = email;
    principal.mobile = mobile;
    principal.gstNumber = gstNumber.toUpperCase();
    principal.panNumber = panNumber.toUpperCase();
    principal.portfolio = portfolio || [];
    principal.addresses = addresses || [];
    principal.contactPersons = contactPersons || [];
    principal.isActive = isActive;
    principal.updatedBy = req.user._id;
    
    // Handle new file uploads
    if (req.files && req.files.documents) {
      const documentFiles = Array.isArray(req.files.documents) 
        ? req.files.documents 
        : [req.files.documents];
      
      const documentNames = req.body.documentNames ? 
        (Array.isArray(req.body.documentNames) ? req.body.documentNames : [req.body.documentNames]) : 
        [];
      
      const hasValidities = req.body.hasValidities ? 
        (Array.isArray(req.body.hasValidities) ? req.body.hasValidities : [req.body.hasValidities]) : 
        [];
      
      const startDates = req.body.startDates ? 
        (Array.isArray(req.body.startDates) ? req.body.startDates : [req.body.startDates]) : 
        [];
      
      const endDates = req.body.endDates ? 
        (Array.isArray(req.body.endDates) ? req.body.endDates : [req.body.endDates]) : 
        [];
      
      const newDocuments = documentFiles.map((file, index) => {
        const hasValidity = hasValidities[index] === 'true' || hasValidities[index] === true;
        return {
          name: documentNames[index] || file.originalname,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasValidity: hasValidity,
          startDate: hasValidity && startDates[index] ? new Date(startDates[index]) : undefined,
          endDate: hasValidity && endDates[index] ? new Date(endDates[index]) : undefined,
          uploadedAt: new Date(),
          uploadedBy: req.user._id
        };
      });
      
      principal.documents.push(...newDocuments);
    }
    
    await principal.save();
    await principal.populate('portfolio', 'name description');
    await principal.populate('addresses.state', 'name code');
    await principal.populate('createdBy', 'name email');
    await principal.populate('updatedBy', 'name email');
    await principal.populate('documents.uploadedBy', 'name email');
    await principal.populate('contactPersons.portfolio', 'name');
    
    res.json({
      message: 'Principal updated successfully',
      principal,
    });
  } catch (error) {
    console.error('Update principal error:', error);
    
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
    
    res.status(500).json({ message: 'Failed to update principal' });
  }
};

export const deletePrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Delete all associated files
    if (principal.documents && principal.documents.length > 0) {
      principal.documents.forEach(document => {
        const filePath = path.join(__dirname, '../uploads/principal-documents', document.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting principal document:', deleteError);
        }
      });
    }
    
    await Principal.findByIdAndDelete(id);
    
    res.json({ message: 'Principal deleted successfully' });
  } catch (error) {
    console.error('Delete principal error:', error);
    res.status(500).json({ message: 'Failed to delete principal' });
  }
};

// Address management
export const addPrincipalAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, city, state, pincode } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Validate state exists
    const stateDoc = await State.findById(state);
    if (!stateDoc) {
      return res.status(400).json({ message: 'Invalid state ID' });
    }
    
    await principal.addAddress({ title, city, state, pincode });
    await principal.populate('addresses.state', 'name code');
    
    res.json({
      message: 'Address added successfully',
      address: principal.addresses[principal.addresses.length - 1]
    });
  } catch (error) {
    console.error('Add principal address error:', error);
    res.status(500).json({ message: 'Failed to add address' });
  }
};

export const updatePrincipalAddress = async (req, res) => {
  try {
    const { id, addressId } = req.params;
    const { title, city, state, pincode } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Validate state exists if provided
    if (state) {
      const stateDoc = await State.findById(state);
      if (!stateDoc) {
        return res.status(400).json({ message: 'Invalid state ID' });
      }
    }
    
    await principal.updateAddress(addressId, { title, city, state, pincode });
    await principal.populate('addresses.state', 'name code');
    
    const updatedAddress = principal.addresses.id(addressId);
    
    res.json({
      message: 'Address updated successfully',
      address: updatedAddress
    });
  } catch (error) {
    console.error('Update principal address error:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

export const deletePrincipalAddress = async (req, res) => {
  try {
    const { id, addressId } = req.params;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    await principal.removeAddress(addressId);
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete principal address error:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

// Document management
export const addPrincipalDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hasValidity, startDate, endDate } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
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
      hasValidity: hasValidity === 'true' || hasValidity === true,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };
    
    if (documentData.hasValidity) {
      documentData.startDate = new Date(startDate);
      documentData.endDate = new Date(endDate);
    }
    
    await principal.addDocument(documentData);
    await principal.populate('documents.uploadedBy', 'name email');
    
    res.json({
      message: 'Document added successfully',
      document: principal.documents[principal.documents.length - 1]
    });
  } catch (error) {
    console.error('Add principal document error:', error);
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

export const updatePrincipalDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const { name, hasValidity, startDate, endDate } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    const updateData = { name };
    
    if (hasValidity !== undefined) {
      updateData.hasValidity = hasValidity === 'true' || hasValidity === true;
      if (updateData.hasValidity) {
        updateData.startDate = new Date(startDate);
        updateData.endDate = new Date(endDate);
      } else {
        updateData.startDate = undefined;
        updateData.endDate = undefined;
      }
    }
    
    await principal.updateDocument(documentId, updateData);
    await principal.populate('documents.uploadedBy', 'name email');
    
    const updatedDocument = principal.documents.id(documentId);
    
    res.json({
      message: 'Document updated successfully',
      document: updatedDocument
    });
  } catch (error) {
    console.error('Update principal document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

export const deletePrincipalDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    const document = principal.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/principal-documents', document.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
    
    await principal.removeDocument(documentId);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete principal document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Contact person management
export const addPrincipalContact = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      portfolio,
      departmentName,
      personName,
      email,
      mobile,
      address,
      location,
      pincode
    } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Validate portfolio exists if provided
    if (portfolio) {
      const portfolioDoc = await Portfolio.findById(portfolio);
      if (!portfolioDoc) {
        return res.status(400).json({ message: 'Invalid portfolio ID' });
      }
    }
    
    const contactData = {
      portfolio: portfolio || null,
      departmentName,
      personName,
      email,
      mobile,
      address: address || '',
      location,
      pincode
    };
    
    await principal.addContactPerson(contactData);
    await principal.populate('contactPersons.portfolio', 'name');
    
    res.json({
      message: 'Contact person added successfully',
      contact: principal.contactPersons[principal.contactPersons.length - 1]
    });
  } catch (error) {
    console.error('Add principal contact error:', error);
    res.status(500).json({ message: 'Failed to add contact person' });
  }
};

export const updatePrincipalContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    const {
      portfolio,
      departmentName,
      personName,
      email,
      mobile,
      address,
      location,
      pincode
    } = req.body;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    // Validate portfolio exists if provided
    if (portfolio) {
      const portfolioDoc = await Portfolio.findById(portfolio);
      if (!portfolioDoc) {
        return res.status(400).json({ message: 'Invalid portfolio ID' });
      }
    }
    
    const contactData = {
      portfolio: portfolio || null,
      departmentName,
      personName,
      email,
      mobile,
      address: address || '',
      location,
      pincode
    };
    
    await principal.updateContactPerson(contactId, contactData);
    await principal.populate('contactPersons.portfolio', 'name');
    
    const updatedContact = principal.contactPersons.id(contactId);
    
    res.json({
      message: 'Contact person updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    console.error('Update principal contact error:', error);
    res.status(500).json({ message: 'Failed to update contact person' });
  }
};

export const deletePrincipalContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    
    const principal = await Principal.findById(id);
    if (!principal) {
      return res.status(404).json({ message: 'Principal not found' });
    }
    
    await principal.removeContactPerson(contactId);
    
    res.json({ message: 'Contact person deleted successfully' });
  } catch (error) {
    console.error('Delete principal contact error:', error);
    res.status(500).json({ message: 'Failed to delete contact person' });
  }
};

// Get principal statistics
export const getPrincipalStats = async (req, res) => {
  try {
    const totalPrincipals = await Principal.countDocuments();
    const activePrincipals = await Principal.countDocuments({ isActive: true });
    
    // Get principals by portfolio
    const principalsByPortfolio = await Principal.aggregate([
      { $unwind: '$portfolio' },
      {
        $lookup: {
          from: 'portfolios',
          localField: 'portfolio',
          foreignField: '_id',
          as: 'portfolioInfo'
        }
      },
      { $unwind: '$portfolioInfo' },
      {
        $group: {
          _id: '$portfolioInfo.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get documents statistics
    const documentStats = await Principal.aggregate([
      { $unwind: '$documents' },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          withValidity: {
            $sum: {
              $cond: ['$documents.hasValidity', 1, 0]
            }
          }
        }
      }
    ]);
    
    // Get expired and expiring documents
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiryStats = await Principal.aggregate([
      { $unwind: '$documents' },
      {
        $match: {
          'documents.hasValidity': true,
          'documents.endDate': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          expired: {
            $sum: {
              $cond: [{ $lt: ['$documents.endDate', now] }, 1, 0]
            }
          },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$documents.endDate', now] },
                    { $lte: ['$documents.endDate', thirtyDaysLater] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      totalPrincipals,
      activePrincipals,
      inactivePrincipals: totalPrincipals - activePrincipals,
      principalsByPortfolio,
      documentStats: documentStats[0] || { totalDocuments: 0, withValidity: 0 },
      expiryStats: expiryStats[0] || { expired: 0, expiringSoon: 0 }
    });
  } catch (error) {
    console.error('Get principal stats error:', error);
    res.status(500).json({ message: 'Failed to fetch principal statistics' });
  }
};