// server/seeders/doctorPermissionsSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';
import User from '../models/User.js';
import connectDB from '../config/database.js';

dotenv.config();

const doctorPermissions = [
  // Doctor permissions
  {
    name: 'View Doctors',
    description: 'Can view doctors list and details',
    resource: 'doctors',
    action: 'view',
  },
  {
    name: 'Create Doctors',
    description: 'Can create new doctors',
    resource: 'doctors',
    action: 'create',
  },
  {
    name: 'Update Doctors',
    description: 'Can update existing doctors',
    resource: 'doctors',
    action: 'update',
  },
  {
    name: 'Delete Doctors',
    description: 'Can delete doctors',
    resource: 'doctors',
    action: 'delete',
  },
  
  // Portfolio permissions
  {
    name: 'View Portfolios',
    description: 'Can view portfolios and specializations',
    resource: 'portfolios',
    action: 'view',
  },
  {
    name: 'Create Portfolios',
    description: 'Can create new portfolios',
    resource: 'portfolios',
    action: 'create',
  },
  {
    name: 'Update Portfolios',
    description: 'Can update existing portfolios',
    resource: 'portfolios',
    action: 'update',
  },
  {
    name: 'Delete Portfolios',
    description: 'Can delete portfolios',
    resource: 'portfolios',
    action: 'delete',
  },
];

async function connectToDatabase() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function seedDoctorPermissions() {
  console.log('👨‍⚕️ Starting Doctor Permissions Seeder...');
  console.log('=====================================');
  
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      console.log('💡 Please check your MongoDB connection and try again.');
      return;
    }
    
    // Check if doctor permissions already exist
    console.log('🔍 Checking for existing doctor permissions...');
    const existingPermissions = await Permission.find({ 
      resource: { $in: ['doctors', 'portfolios'] } 
    });
    
    if (existingPermissions.length > 0) {
      console.log(`🗑️  Found ${existingPermissions.length} existing doctor permissions. Removing them...`);
      existingPermissions.forEach((permission, index) => {
        console.log(`   ${index + 1}. ${permission.name} (${permission.resource}.${permission.action})`);
      });
      
      // Remove existing user permissions for doctor resources
      console.log('🔄 Removing existing user permission assignments...');
      const existingPermissionIds = existingPermissions.map(p => p._id);
      await UserPermission.deleteMany({ 
        permissionId: { $in: existingPermissionIds } 
      });
      console.log('✅ Removed existing user permission assignments');
      
      // Remove existing doctor permissions
      await Permission.deleteMany({ 
        resource: { $in: ['doctors', 'portfolios'] } 
      });
      console.log('✅ Removed existing doctor permissions');
    }
    
    // Create fresh permissions
    console.log('🔄 Creating fresh doctor permissions...');
    const createdPermissions = await Permission.insertMany(doctorPermissions);
    console.log(`✅ Successfully created ${createdPermissions.length} fresh doctor permissions`);

    // Get all current doctor permissions (freshly created)
    const allDoctorPermissions = await Permission.find({ 
      resource: { $in: ['doctors', 'portfolios'] } 
    });

    // Find users to assign permissions to
    console.log('👤 Looking for users to assign permissions...');
    const adminEmails = ['admin@matrixmedys.com', 'admin@techcorp.com'];
    let targetUser = null;
    
    // Try to find admin user
    for (const email of adminEmails) {
      targetUser = await User.findOne({ email });
      if (targetUser) {
        console.log(`👤 Found admin user: ${targetUser.email}`);
        break;
      }
    }
    
    // If no admin found, use first user
    if (!targetUser) {
      targetUser = await User.findOne().sort({ createdAt: 1 });
      if (targetUser) {
        console.log(`👤 Using first user: ${targetUser.email}`);
      }
    }
    
    if (targetUser) {
      // Assign permissions to user
      console.log('🎯 Assigning permissions to user...');
      
      for (const permission of allDoctorPermissions) {
        // Check if permission is already assigned
        const existingAssignment = await UserPermission.findOne({
          userId: targetUser._id,
          permissionId: permission._id
        });
        
        if (!existingAssignment) {
          await UserPermission.create({
            userId: targetUser._id,
            permissionId: permission._id
          });
        }
      }
      
      console.log(`✅ Successfully assigned doctor permissions to: ${targetUser.email}`);
    } else {
      console.log('⚠️  No users found in database.');
      console.log('💡 Create a user first, then run this seeder again.');
      console.log('💡 Or run: npm run seed:comprehensive');
    }
    
    // Summary
    console.log('=====================================');
    console.log('🎉 Doctor Permissions Seeder Completed!');
    console.log('=====================================');
    console.log('📋 Summary:');
    console.log(`   👨‍⚕️ Doctor Permissions: ${doctorPermissions.filter(p => p.resource === 'doctors').length}`);
    console.log(`   📁 Portfolio Permissions: ${doctorPermissions.filter(p => p.resource === 'portfolios').length}`);
    console.log(`   📊 Total Permissions: ${doctorPermissions.length}`);
    console.log('=====================================');
    console.log('Doctor permissions:');
    doctorPermissions
      .filter(p => p.resource === 'doctors')
      .forEach((p, index) => console.log(`   ${index + 1}. ${p.name}: ${p.description}`));
    console.log('Portfolio permissions:');
    doctorPermissions
      .filter(p => p.resource === 'portfolios')
      .forEach((p, index) => console.log(`   ${index + 1}. ${p.name}: ${p.description}`));
    console.log('=====================================');
    console.log('🚀 You can now use Doctor Management features!');
    console.log('🌐 Access the frontend at: http://localhost:5173');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    console.error('Error details:', error.message);
    
    // Helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 MongoDB is not running. Please start MongoDB and try again.');
      console.log('   - For local MongoDB: mongod');
      console.log('   - For Docker: docker run -d -p 27017:27017 mongo');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Check your MongoDB credentials in the .env file.');
    } else if (error.message.includes('Cannot read properties')) {
      console.log('💡 There might be an issue with the database models.');
    }
    
  } finally {
    try {
      await mongoose.disconnect();
      console.log('📤 Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');

if (force) {
  console.log('⚠️  Force mode enabled - will recreate permissions');
}

// Run the seeder
seedDoctorPermissions();