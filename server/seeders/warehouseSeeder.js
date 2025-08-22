import mongoose from 'mongoose';
import Warehouse from '../models/Warehouse.js';
import Branch from '../models/Branch.js';
import State from '../models/State.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Sample warehouse data template
const warehouseTemplates = [
  {
    name: 'Main Medical Warehouse',
    warehouseCode: 'WH-MAIN',
    drugLicenseNumber: 'DL-WH-001-2024',
    address: 'Industrial Area, Sector 1',
    district: '',
    pincode: '',
    phone: '',
    email: '',
    alternatePhone: '',
    status: 'Active',
    isActive: true,
    remarks: 'Primary warehouse for medical supplies and equipment'
  },
  {
    name: 'Pharmaceutical Storage',
    warehouseCode: 'WH-PHARMA',
    drugLicenseNumber: 'DL-WH-002-2024',
    address: 'Pharma Complex, Zone B',
    district: '',
    pincode: '',
    phone: '',
    email: '',
    alternatePhone: '',
    status: 'Active',
    isActive: true,
    remarks: 'Temperature-controlled warehouse for pharmaceutical products'
  },
  {
    name: 'Equipment Storage',
    warehouseCode: 'WH-EQUIP',
    drugLicenseNumber: 'DL-WH-003-2024',
    address: 'Equipment Hub, Block C',
    district: '',
    pincode: '',
    phone: '',
    email: '',
    alternatePhone: '',
    status: 'Active',
    isActive: true,
    remarks: 'Specialized storage for medical equipment and devices'
  }
];

// Function to generate warehouse data for each branch
const generateWarehouseData = (branch, template, index, adminUser, branchState) => {
  const branchCode = branch.branchCode.split('-')[0]; // Extract city code
  const warehouseCode = `${branchCode}-${template.warehouseCode.split('-')[1]}-${String(index + 1).padStart(2, '0')}`;
  
  // Generate phone number based on branch phone
  const basePhone = branch.phone.replace(/\d{4}$/, String(2000 + index * 100 + Math.floor(Math.random() * 99)).padStart(4, '0'));
  
  return {
    ...template,
    name: `${branch.city} ${template.name}`,
    warehouseCode: warehouseCode,
    branch: branch._id,
    address: `${template.address}, ${branch.city}`,
    district: branch.city,
    pincode: branch.pincode,
    phone: basePhone,
    alternatePhone: basePhone.replace(/\d{2}$/, String(Math.floor(Math.random() * 99)).padStart(2, '0')),
    email: `${template.warehouseCode.toLowerCase().replace('wh-', '')}@${branch.email.split('@')[1]}`,
    state: branchState._id,
    createdBy: adminUser._id
  };
};

// Function to seed warehouses
const seedWarehouses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing warehouses
    await Warehouse.deleteMany({});
    console.log('Cleared existing warehouses');

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      console.error('Admin user not found. Please run user seeder first.');
      return;
    }
    console.log('Found admin user for createdBy field');

    // Get all branches with state information
    const branches = await Branch.find({}).populate('state');
    
    if (branches.length === 0) {
      console.log('No branches found. Please run branch seeder first.');
      return;
    }

    console.log(`Found ${branches.length} branches`);

    const warehousesToCreate = [];

    // Create warehouses for each branch
    branches.forEach((branch, branchIndex) => {
      // Create 2-3 warehouses per branch (randomly)
      const warehouseCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 warehouses
      
      for (let i = 0; i < warehouseCount && i < warehouseTemplates.length; i++) {
        const warehouse = generateWarehouseData(branch, warehouseTemplates[i], i, adminUser, branch.state);
        warehousesToCreate.push(warehouse);
      }
    });

    // Insert warehouses
    const createdWarehouses = await Warehouse.insertMany(warehousesToCreate);
    console.log(`\nSuccessfully created ${createdWarehouses.length} warehouses:`);
    
    // Group warehouses by branch for better display
    const warehousesByBranch = {};
    createdWarehouses.forEach(warehouse => {
      const branchId = warehouse.branch.toString();
      if (!warehousesByBranch[branchId]) {
        warehousesByBranch[branchId] = [];
      }
      warehousesByBranch[branchId].push(warehouse);
    });

    // Display warehouses grouped by branch
    for (const branch of branches) {
      const branchWarehouses = warehousesByBranch[branch._id.toString()] || [];
      console.log(`\n${branch.name} (${branch.branchCode}):`);
      branchWarehouses.forEach(warehouse => {
        console.log(`  - ${warehouse.name} (${warehouse.warehouseCode})`);
      });
    }

    console.log('\nWarehouse seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding warehouses:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
seedWarehouses();

export { seedWarehouses };