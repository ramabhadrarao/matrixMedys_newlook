// server/controllers/doctorController.js
import Doctor from '../models/Doctor.js';
import Portfolio from '../models/Portfolio.js';
import Hospital from '../models/Hospital.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', portfolio = '', hospital = '' } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (portfolio) {
      query.portfolio = { $in: [portfolio] };
    }
    
    if (hospital) {
      query.hospitals = { $in: [hospital] };
    }
    
    const doctors = await Doctor.find(query)
      .populate('portfolio', 'name description')
      .populate('hospitals', 'name city state')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('attachments.uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Doctor.countDocuments(query);
    
    res.json({
      doctors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
};

export const getDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id)
      .populate('portfolio', 'name description')
      .populate('hospitals', 'name city state email phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({
      doctor,
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Failed to fetch doctor' });
  }
};

export const createDoctor = async (req, res) => {
  try {
    console.log('Create doctor request body:', req.body);
    console.log('Request files:', req.files);
    
    // Parse form data properly
    let {
      name,
      email,
      phone,
      portfolio,
      hospitals,
      location,
      targets
    } = req.body;
    
    // Handle form data arrays - they come as strings when sent via FormData
    if (typeof portfolio === 'string') {
      portfolio = [portfolio];
    } else if (!Array.isArray(portfolio)) {
      portfolio = [];
    }
    
    if (typeof hospitals === 'string') {
      hospitals = [hospitals];
    } else if (!Array.isArray(hospitals)) {
      hospitals = [];
    }
    
    // Parse targets if it comes as a string
    if (typeof targets === 'string') {
      try {
        targets = JSON.parse(targets);
      } catch (e) {
        targets = [];
      }
    } else if (!Array.isArray(targets)) {
      targets = [];
    }
    
    console.log('Parsed data:', { name, email, phone, portfolio, hospitals, location, targets });
    
    // Validate required fields
    if (!name || !email || !phone || !location) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          !name && { param: 'name', msg: 'Name is required' },
          !email && { param: 'email', msg: 'Email is required' },
          !phone && { param: 'phone', msg: 'Phone is required' },
          !location && { param: 'location', msg: 'Location is required' }
        ].filter(Boolean)
      });
    }
    
    // Check if email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ 
        message: 'Doctor with this email already exists',
        errors: [{ param: 'email', msg: 'Email already exists' }]
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
    
    // Validate hospitals exist
    if (!hospitals || hospitals.length === 0) {
      return res.status(400).json({ 
        message: 'At least one hospital is required',
        errors: [{ param: 'hospitals', msg: 'At least one hospital is required' }]
      });
    }
    
    const hospitalDocs = await Hospital.find({ _id: { $in: hospitals } });
    if (hospitalDocs.length !== hospitals.length) {
      return res.status(400).json({ 
        message: 'Some hospitals are invalid',
        errors: [{ param: 'hospitals', msg: 'Invalid hospital IDs provided' }]
      });
    }
    
    const doctorData = {
      name,
      email,
      phone,
      portfolio: portfolio || [],
      hospitals: hospitals || [],
      location,
      targets: targets || [],
      createdBy: req.user._id,
      attachments: []
    };
    
    // Handle file uploads
    if (req.files && req.files.attachments) {
      const attachmentFiles = Array.isArray(req.files.attachments) 
        ? req.files.attachments 
        : [req.files.attachments];
      
      const fileTypes = req.body.fileTypes ? 
        (Array.isArray(req.body.fileTypes) ? req.body.fileTypes : [req.body.fileTypes]) : 
        [];
      
      const descriptions = req.body.descriptions ? 
        (Array.isArray(req.body.descriptions) ? req.body.descriptions : [req.body.descriptions]) : 
        [];
      
      doctorData.attachments = attachmentFiles.map((file, index) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType: fileTypes[index] || 'other',
        description: descriptions[index] || '',
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
    }
    
    const doctor = new Doctor(doctorData);
    await doctor.save();
    await doctor.populate('portfolio', 'name description');
    await doctor.populate('hospitals', 'name city state');
    await doctor.populate('createdBy', 'name email');
    await doctor.populate('attachments.uploadedBy', 'name email');
    
    res.status(201).json({
      message: 'Doctor created successfully',
      doctor,
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    
    // Clean up uploaded files if doctor creation fails
    if (req.files && req.files.attachments) {
      const files = Array.isArray(req.files.attachments) ? req.files.attachments : [req.files.attachments];
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to create doctor' });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      email,
      phone,
      portfolio,
      hospitals,
      location,
      targets,
      isActive
    } = req.body;
    
    // Handle form data arrays - they come as strings when sent via FormData
    if (typeof portfolio === 'string') {
      portfolio = [portfolio];
    } else if (!Array.isArray(portfolio)) {
      portfolio = [];
    }
    
    if (typeof hospitals === 'string') {
      hospitals = [hospitals];
    } else if (!Array.isArray(hospitals)) {
      hospitals = [];
    }
    
    // Parse targets if it comes as a string
    if (typeof targets === 'string') {
      try {
        targets = JSON.parse(targets);
      } catch (e) {
        targets = [];
      }
    } else if (!Array.isArray(targets)) {
      targets = [];
    }
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if email already exists (excluding current doctor)
    if (email !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email, _id: { $ne: id } });
      if (existingDoctor) {
        return res.status(400).json({ message: 'Doctor with this email already exists' });
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
    
    // Validate hospitals exist
    if (!hospitals || hospitals.length === 0) {
      return res.status(400).json({ 
        message: 'At least one hospital is required',
        errors: [{ param: 'hospitals', msg: 'At least one hospital is required' }]
      });
    }
    
    const hospitalDocs = await Hospital.find({ _id: { $in: hospitals } });
    if (hospitalDocs.length !== hospitals.length) {
      return res.status(400).json({ message: 'Some hospitals are invalid' });
    }
    
    // Update fields
    doctor.name = name;
    doctor.email = email;
    doctor.phone = phone;
    doctor.portfolio = portfolio || [];
    doctor.hospitals = hospitals || [];
    doctor.location = location;
    doctor.targets = targets || [];
    doctor.isActive = isActive;
    doctor.updatedBy = req.user._id;
    
    // Handle new file uploads
    if (req.files && req.files.attachments) {
      const attachmentFiles = Array.isArray(req.files.attachments) 
        ? req.files.attachments 
        : [req.files.attachments];
      
      const fileTypes = req.body.fileTypes ? 
        (Array.isArray(req.body.fileTypes) ? req.body.fileTypes : [req.body.fileTypes]) : 
        [];
      
      const descriptions = req.body.descriptions ? 
        (Array.isArray(req.body.descriptions) ? req.body.descriptions : [req.body.descriptions]) : 
        [];
      
      const newAttachments = attachmentFiles.map((file, index) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType: fileTypes[index] || 'other',
        description: descriptions[index] || '',
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
      
      doctor.attachments.push(...newAttachments);
    }
    
    await doctor.save();
    await doctor.populate('portfolio', 'name description');
    await doctor.populate('hospitals', 'name city state');
    await doctor.populate('createdBy', 'name email');
    await doctor.populate('updatedBy', 'name email');
    await doctor.populate('attachments.uploadedBy', 'name email');
    
    res.json({
      message: 'Doctor updated successfully',
      doctor,
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    
    // Clean up uploaded files if update fails
    if (req.files && req.files.attachments) {
      const files = Array.isArray(req.files.attachments) ? req.files.attachments : [req.files.attachments];
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ message: 'Failed to update doctor' });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Delete all associated files
    if (doctor.attachments && doctor.attachments.length > 0) {
      doctor.attachments.forEach(attachment => {
        const filePath = path.join(__dirname, '../uploads/doctor-attachments', attachment.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting doctor attachment:', deleteError);
        }
      });
    }
    
    await Doctor.findByIdAndDelete(id);
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Failed to delete doctor' });
  }
};

// Add a new attachment to doctor
export const addDoctorAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType, description } = req.body;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const attachmentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fileType: fileType || 'other',
      description: description || '',
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };
    
    await doctor.addAttachment(attachmentData);
    await doctor.populate('attachments.uploadedBy', 'name email');
    
    res.json({
      message: 'Attachment added successfully',
      attachment: doctor.attachments[doctor.attachments.length - 1]
    });
  } catch (error) {
    console.error('Add doctor attachment error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Failed to add attachment' });
  }
};

// Delete doctor attachment
export const deleteDoctorAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const attachment = doctor.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/doctor-attachments', attachment.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Error deleting file:', deleteError);
    }
    
    // Remove attachment from array
    doctor.attachments.id(attachmentId).remove();
    await doctor.save();
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete doctor attachment error:', error);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
};