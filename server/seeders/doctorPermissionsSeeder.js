// server/seeders/doctorPermissionsSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';
import User from '../models/User.js';

dotenv.config();

const doctorPermissions = [
  // Doctor permissions
  {
    name: 'doctors_view',
    description: 'View doctors and their information',
    resource: 'doctors',
    action: 'view',
  },
  {
    name: 'doctors_create',
    description: 'Create new doctors',
    resource: 'doctors',
    action: 'create',
  },
  {
    name: 'doctors_update',
    description: 'Update existing doctors',
    resource: 'doctors',
    action: 'update',
  },
  {
    name: 'doctors_delete',
    description: 'Delete doctors',
    resource: 'doctors',
    action: 'delete',
  },
  
  // Portfolio permissions
  {
    name: 'portfolios_view',
    description: 'View portfolios and specializations',
    resource: 'portfolios',
    action: 'view',
  },
  {
    name: 'portfolios_create',
    description: 'Create new portfolios',
    resource: 'portfolios',
    action: 'create',
  },
  {
    name: 'portfolios_update',
    description: 'Update existing portfolios',
    resource: 'portfolios',
    action: 'update',
  },
  {
    name: 'portfolios_delete',
    description: 'Delete portfolios',
    resource: 'portfolios',
    action: 'delete',
  },
];

const seedDoctorPermissions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if doctor permissions already exist
    const existingDoctorPermissions = await Permission.find({ 
      resource: { $in: ['doctors', 'portfolios'] } 
    });
    
    if (existingDoctorPermissions.length > 0) {
      console.log('Doctor permissions already exist. Updating if necessary...');
      
      // Update existing permissions and add new ones
      for (const permissionData of doctorPermissions) {
        await Permission.findOneAndUpdate(
          { name: permissionData.name },
          permissionData,
          { upsert: true, new: true }
        );
      }
    } else {
      // Create new permissions
      await Permission.insertMany(doctorPermissions);
      console.log('Doctor permissions created successfully');
    }

    // Get all permissions
    const allPermissions = await Permission.find({ 
      resource: { $in: ['doctors', 'portfolios'] } 
    });

    // Find the first user (admin) and assign all doctor permissions
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    if (firstUser) {
      console.log(`Assigning doctor permissions to user: ${firstUser.email}`);
      
      for (const permission of allPermissions) {
        // Check if permission is already assigned
        const existingAssignment = await UserPermission.findOne({
          userId: firstUser._id,
          permissionId: permission._id
        });
        
        if (!existingAssignment) {
          await UserPermission.create({
            userId: firstUser._id,
            permissionId: permission._id
          });
        }
      }
      
      console.log('Doctor permissions assigned to admin user successfully');
    } else {
      console.log('No users found. Please register a user first.');
    }

    // Display summary
    console.log('\n=== Doctor Permissions Summary ===');
    console.log(`Total doctor permissions: ${doctorPermissions.length}`);
    console.log('Doctor permissions:');
    doctorPermissions
      .filter(p => p.resource === 'doctors')
      .forEach(p => console.log(`  - ${p.name}: ${p.description}`));
    console.log('Portfolio permissions:');
    doctorPermissions
      .filter(p => p.resource === 'portfolios')
      .forEach(p => console.log(`  - ${p.name}: ${p.description}`));
    console.log('=====================================\n');

  } catch (error) {
    console.error('Error seeding doctor permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeder
seedDoctorPermissions();