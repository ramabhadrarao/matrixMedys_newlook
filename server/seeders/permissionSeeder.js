import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const permissions = [
  // States permissions
  { name: 'View States', description: 'Can view states list and details', resource: 'states', action: 'view' },
  { name: 'Create States', description: 'Can create new states', resource: 'states', action: 'create' },
  { name: 'Update States', description: 'Can update existing states', resource: 'states', action: 'update' },
  { name: 'Delete States', description: 'Can delete states', resource: 'states', action: 'delete' },
  
  // Users permissions
  { name: 'View Users', description: 'Can view users list and details', resource: 'users', action: 'view' },
  { name: 'Create Users', description: 'Can create new users', resource: 'users', action: 'create' },
  { name: 'Update Users', description: 'Can update existing users', resource: 'users', action: 'update' },
  { name: 'Delete Users', description: 'Can delete users', resource: 'users', action: 'delete' },
];

const seedPermissions = async () => {
  try {
    await connectDB();
    
    // Clear existing permissions
    await Permission.deleteMany({});
    await UserPermission.deleteMany({});
    
    // Create permissions
    const createdPermissions = await Permission.insertMany(permissions);
    console.log(`Created ${createdPermissions.length} permissions`);
    
    // Find the first user (admin)
    const adminUser = await User.findOne().sort({ createdAt: 1 });
    
    if (adminUser) {
      // Give admin user all permissions
      const userPermissions = createdPermissions.map(permission => ({
        userId: adminUser._id,
        permissionId: permission._id,
      }));
      
      await UserPermission.insertMany(userPermissions);
      console.log(`Assigned all permissions to admin user: ${adminUser.email}`);
    }
    
    console.log('Permission seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
};

seedPermissions();