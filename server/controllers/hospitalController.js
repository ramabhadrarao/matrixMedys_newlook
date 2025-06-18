// server/controllers/hospitalController.js
import Hospital from '../models/Hospital.js';
import HospitalContact from '../models/HospitalContact.js';

export const getHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ]
    } : {};
    
    const hospitals = await Hospital.find(query)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Hospital.countDocuments(query);
    
    res.json({
      hospitals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ message: 'Failed to fetch hospitals' });
  }
};

export const getHospital = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hospital = await Hospital.findById(id)
      .populate('state', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Get hospital contacts
    const contacts = await HospitalContact.find({ hospital: id })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      hospital,
      contacts,
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ message: 'Failed to fetch hospital' });
  }
};

export const createHospital = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      agreementFile,
      gstAddress,
      city,
      state,
      pincode
    } = req.body;
    
    // Check if GST number already exists
    const existingGST = await Hospital.findOne({ gstNumber });
    if (existingGST) {
      return res.status(400).json({ message: 'Hospital with this GST number already exists' });
    }
    
    // Check if PAN number already exists
    const existingPAN = await Hospital.findOne({ panNumber });
    if (existingPAN) {
      return res.status(400).json({ message: 'Hospital with this PAN number already exists' });
    }
    
    const hospital = new Hospital({
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      agreementFile,
      gstAddress,
      city,
      state,
      pincode,
      createdBy: req.user._id,
    });
    
    await hospital.save();
    await hospital.populate('state', 'name code');
    await hospital.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Hospital created successfully',
      hospital,
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({ message: 'Failed to create hospital' });
  }
};

export const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      gstNumber,
      panNumber,
      agreementFile,
      gstAddress,
      city,
      state,
      pincode,
      isActive
    } = req.body;
    
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Check if GST number already exists (excluding current hospital)
    if (gstNumber !== hospital.gstNumber) {
      const existingGST = await Hospital.findOne({ gstNumber, _id: { $ne: id } });
      if (existingGST) {
        return res.status(400).json({ message: 'Hospital with this GST number already exists' });
      }
    }
    
    // Check if PAN number already exists (excluding current hospital)
    if (panNumber !== hospital.panNumber) {
      const existingPAN = await Hospital.findOne({ panNumber, _id: { $ne: id } });
      if (existingPAN) {
        return res.status(400).json({ message: 'Hospital with this PAN number already exists' });
      }
    }
    
    // Update fields
    hospital.name = name;
    hospital.email = email;
    hospital.phone = phone;
    hospital.gstNumber = gstNumber;
    hospital.panNumber = panNumber;
    hospital.agreementFile = agreementFile;
    hospital.gstAddress = gstAddress;
    hospital.city = city;
    hospital.state = state;
    hospital.pincode = pincode;
    hospital.isActive = isActive;
    hospital.updatedBy = req.user._id;
    
    await hospital.save();
    await hospital.populate('state', 'name code');
    await hospital.populate('createdBy', 'name email');
    await hospital.populate('updatedBy', 'name email');
    
    res.json({
      message: 'Hospital updated successfully',
      hospital,
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ message: 'Failed to update hospital' });
  }
};

export const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Check if hospital has contacts
    const contactsCount = await HospitalContact.countDocuments({ hospital: id });
    if (contactsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete hospital. It has ${contactsCount} contact(s) associated with it. Please delete all contacts first.` 
      });
    }
    
    await Hospital.findByIdAndDelete(id);
    
    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ message: 'Failed to delete hospital' });
  }
};

// Hospital Contacts CRUD
export const getHospitalContacts = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {
      hospital: hospitalId,
      ...(search && {
        $or: [
          { departmentName: { $regex: search, $options: 'i' } },
          { personName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ]
      })
    };
    
    const contacts = await HospitalContact.find(query)
      .populate('hospital', 'name')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await HospitalContact.countDocuments(query);
    
    res.json({
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get hospital contacts error:', error);
    res.status(500).json({ message: 'Failed to fetch hospital contacts' });
  }
};

export const createHospitalContact = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const {
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode
    } = req.body;
    
    // Verify hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    const contact = new HospitalContact({
      hospital: hospitalId,
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode,
      createdBy: req.user._id,
    });
    
    await contact.save();
    await contact.populate('hospital', 'name');
    await contact.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Hospital contact created successfully',
      contact,
    });
  } catch (error) {
    console.error('Create hospital contact error:', error);
    res.status(500).json({ message: 'Failed to create hospital contact' });
  }
};

export const updateHospitalContact = async (req, res) => {
  try {
    const { hospitalId, contactId } = req.params;
    const {
      departmentName,
      personName,
      email,
      phone,
      address,
      location,
      pincode,
      isActive
    } = req.body;
    
    const contact = await HospitalContact.findOne({ _id: contactId, hospital: hospitalId });
    if (!contact) {
      return res.status(404).json({ message: 'Hospital contact not found' });
    }
    
    // Update fields
    contact.departmentName = departmentName;
    contact.personName = personName;
    contact.email = email;
    contact.phone = phone;
    contact.address = address;
    contact.location = location;
    contact.pincode = pincode;
    contact.isActive = isActive;
    contact.updatedBy = req.user._id;
    
    await contact.save();
    await contact.populate('hospital', 'name');
    await contact.populate('createdBy', 'name email');
    await contact.populate('updatedBy', 'name email');
    
    res.json({
      message: 'Hospital contact updated successfully',
      contact,
    });
  } catch (error) {
    console.error('Update hospital contact error:', error);
    res.status(500).json({ message: 'Failed to update hospital contact' });
  }
};

export const deleteHospitalContact = async (req, res) => {
  try {
    const { hospitalId, contactId } = req.params;
    
    const contact = await HospitalContact.findOne({ _id: contactId, hospital: hospitalId });
    if (!contact) {
      return res.status(404).json({ message: 'Hospital contact not found' });
    }
    
    await HospitalContact.findByIdAndDelete(contactId);
    
    res.json({ message: 'Hospital contact deleted successfully' });
  } catch (error) {
    console.error('Delete hospital contact error:', error);
    res.status(500).json({ message: 'Failed to delete hospital contact' });
  }
};