import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import State from '../models/State.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Sample branch data
const branches = [
  {
    name: 'Mumbai Central Branch',
    email: 'mumbai.central@matrixmedys.com',
    phone: '+91-22-2266-7788',
    alternatePhone: '+91-22-2266-7789',
    branchCode: 'MUM-001',
    drugLicenseNumber: 'DL-MH-001-2024',
    gstNumber: '27ABCDE1234F1Z5',
    panNumber: 'ABCDE1234F',
    gstAddress: '123 Marine Drive, Mumbai, Maharashtra 400001',
    city: 'Mumbai',
    pincode: '400001',
    remarks: 'Main branch located in the heart of Mumbai financial district',
    isActive: true
  },
  {
    name: 'Delhi North Branch',
    email: 'delhi.north@matrixmedys.com',
    phone: '+91-11-4155-6677',
    alternatePhone: '+91-11-4155-6678',
    branchCode: 'DEL-001',
    drugLicenseNumber: 'DL-DL-001-2024',
    gstNumber: '07FGHIJ5678K2L6',
    panNumber: 'FGHIJ5678K',
    gstAddress: '456 Connaught Place, New Delhi, Delhi 110001',
    city: 'New Delhi',
    pincode: '110001',
    remarks: 'Strategic branch serving North Delhi and NCR region',
    isActive: true
  },
  {
    name: 'Bangalore Tech Branch',
    email: 'bangalore.tech@matrixmedys.com',
    phone: '+91-80-4088-9900',
    alternatePhone: '+91-80-4088-9901',
    branchCode: 'BLR-001',
    drugLicenseNumber: 'DL-KA-001-2024',
    gstNumber: '29KLMNO9012P3Q7',
    panNumber: 'KLMNO9012P',
    gstAddress: '789 MG Road, Bangalore, Karnataka 560001',
    city: 'Bangalore',
    pincode: '560001',
    remarks: 'Technology hub branch focusing on IT and healthcare innovation',
    isActive: true
  },
  {
    name: 'Chennai South Branch',
    email: 'chennai.south@matrixmedys.com',
    phone: '+91-44-2833-4455',
    alternatePhone: '+91-44-2833-4456',
    branchCode: 'CHE-001',
    drugLicenseNumber: 'DL-TN-001-2024',
    gstNumber: '33RSTUV3456W4X8',
    panNumber: 'RSTUV3456W',
    gstAddress: '321 Anna Salai, Chennai, Tamil Nadu 600002',
    city: 'Chennai',
    pincode: '600002',
    remarks: 'Regional branch serving Tamil Nadu and southern states',
    isActive: true
  },
  {
    name: 'Pune West Branch',
    email: 'pune.west@matrixmedys.com',
    phone: '+91-20-2567-8899',
    alternatePhone: '+91-20-2567-8800',
    branchCode: 'PUN-001',
    drugLicenseNumber: 'DL-MH-002-2024',
    gstNumber: '27YZABC7890D5E9',
    panNumber: 'YZABC7890D',
    gstAddress: '654 FC Road, Pune, Maharashtra 411005',
    city: 'Pune',
    pincode: '411005',
    remarks: 'Growing branch serving Pune metropolitan area',
    isActive: true
  },
  {
    name: 'Kolkata East Branch',
    email: 'kolkata.east@matrixmedys.com',
    phone: '+91-33-2244-5566',
    alternatePhone: '+91-33-2244-5567',
    branchCode: 'KOL-001',
    drugLicenseNumber: 'DL-WB-001-2024',
    gstNumber: '19FGHIJ2345K6L0',
    panNumber: 'FGHIJ2345K',
    gstAddress: '987 Park Street, Kolkata, West Bengal 700016',
    city: 'Kolkata',
    pincode: '700016',
    remarks: 'Heritage branch serving West Bengal and eastern region',
    isActive: true
  }
];

// Function to seed branches
const seedBranches = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing branches
    await Branch.deleteMany({});
    console.log('Cleared existing branches');

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      console.error('Admin user not found. Please run user seeder first.');
      return;
    }
    console.log('Found admin user for createdBy field');

    // Get states for reference
    const states = await State.find({});
    console.log(`Found ${states.length} states in database`);

    // Add required fields to branches
    const branchesToCreate = branches.map(branch => {
      const branchData = {
        ...branch,
        createdBy: adminUser._id
      };

      // Add state reference if states exist
      if (states.length > 0) {
        const stateMapping = {
          'Mumbai': states.find(s => s.name.toLowerCase().includes('maharashtra')),
          'New Delhi': states.find(s => s.name.toLowerCase().includes('delhi')),
          'Bangalore': states.find(s => s.name.toLowerCase().includes('karnataka')),
          'Chennai': states.find(s => s.name.toLowerCase().includes('tamil')),
          'Pune': states.find(s => s.name.toLowerCase().includes('maharashtra')),
          'Kolkata': states.find(s => s.name.toLowerCase().includes('bengal'))
        };

        const state = stateMapping[branch.city];
        if (state) {
          branchData.state = state._id;
        } else {
          // Use first state as fallback
          branchData.state = states[0]._id;
        }
      }

      return branchData;
    });

    // Insert sample branches
    const createdBranches = await Branch.insertMany(branchesToCreate);
    console.log(`Successfully created ${createdBranches.length} branches:`);
    
    createdBranches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.branchCode})`);
    });

    console.log('\nBranch seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding branches:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
seedBranches();

export { seedBranches };