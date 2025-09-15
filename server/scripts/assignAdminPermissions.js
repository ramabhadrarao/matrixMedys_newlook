// server/scripts/assignAdminPermissions.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

dotenv.config();

async function assignAllPermissionsToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({
      $or: [
        { email: 'admin@matrixmedys.com' },
        { role: 'admin' }
      ]
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('Please create admin user first using the createAdminUser script');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.name} (${adminUser.email})`);

    // Get all permissions from the database
    const allPermissions = await Permission.find({});
    console.log(`📋 Found ${allPermissions.length} total permissions in database`);

    if (allPermissions.length === 0) {
      console.log('❌ No permissions found in database!');
      console.log('Please run the permission seeder first');
      return;
    }

    // Create permission name array in the format expected by User schema
    const permissionNames = allPermissions.map(perm => `${perm.resource}.${perm.action}`);

    console.log('\n📝 Permissions to assign:');
    
    // Group permissions by resource for better display
    const groupedPermissions = {};
    permissionNames.forEach(perm => {
      const [resource, action] = perm.split('.');
      if (!groupedPermissions[resource]) {
        groupedPermissions[resource] = [];
      }
      groupedPermissions[resource].push(action);
    });

    Object.keys(groupedPermissions).sort().forEach(resource => {
      console.log(`  ${resource}: ${groupedPermissions[resource].join(', ')}`);
    });

    // Check current admin permissions
    console.log(`\n🔍 Current admin permissions: ${adminUser.permissions ? adminUser.permissions.length : 0}`);
    
    if (adminUser.permissions && adminUser.permissions.length > 0) {
      console.log('Current permissions:');
      adminUser.permissions.forEach(perm => console.log(`  - ${perm}`));
    }

    // Update admin user with all permissions
    const updatedAdmin = await User.findByIdAndUpdate(
      adminUser._id,
      {
        permissions: permissionNames,
        role: 'admin', // Ensure role is admin
        isActive: true // Ensure admin is active
      },
      { new: true }
    );

    console.log('\n✅ Successfully assigned all permissions to admin user!');
    console.log('=====================================');
    console.log('Updated Admin User:');
    console.log(`Name: ${updatedAdmin.name}`);
    console.log(`Email: ${updatedAdmin.email}`);
    console.log(`Role: ${updatedAdmin.role}`);
    console.log(`Active: ${updatedAdmin.isActive}`);
    console.log(`Total Permissions: ${updatedAdmin.permissions.length}`);
    console.log('=====================================');

    // Verify assignment worked
    const verifyAdmin = await User.findById(adminUser._id);
    if (verifyAdmin.permissions.length === allPermissions.length) {
      console.log('✅ Verification successful - All permissions assigned correctly');
    } else {
      console.log('⚠️  Warning: Permission count mismatch');
      console.log(`Expected: ${allPermissions.length}, Actual: ${verifyAdmin.permissions.length}`);
    }

  } catch (error) {
    console.error('❌ Error assigning permissions to admin:', error);
    
    if (error.code === 11000) {
      console.log('Duplicate key error - this should not happen for updates');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Alternative function to create admin with all permissions if not exists
async function createOrUpdateAdminWithAllPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all permissions first
    const allPermissions = await Permission.find({});
    const permissionNames = allPermissions.map(perm => `${perm.resource}.${perm.action}`);

    console.log(`📋 Found ${allPermissions.length} permissions in database`);

    // Try to find existing admin
    let adminUser = await User.findOne({
      $or: [
        { email: 'admin@matrixmedys.com' },
        { role: 'admin' }
      ]
    });

    if (adminUser) {
      console.log(`✅ Found existing admin: ${adminUser.name}`);
      
      // Update with all permissions
      const updatedAdmin = await User.findByIdAndUpdate(
        adminUser._id,
        {
          permissions: permissionNames,
          role: 'admin',
          isActive: true
        },
        { new: true }
      );
      
      console.log('✅ Updated existing admin with all permissions');
      
      // Verify the update worked
      const verifiedAdmin = await User.findById(adminUser._id);
      console.log(`\nFinal admin permissions: ${verifiedAdmin.permissions ? verifiedAdmin.permissions.length : 0}`);
      
      if (verifiedAdmin.permissions && verifiedAdmin.permissions.length === allPermissions.length) {
        console.log('✅ Verification successful - All permissions assigned correctly');
      } else {
        console.log('⚠️  Warning: Permission count mismatch');
        console.log(`Expected: ${allPermissions.length}, Actual: ${verifiedAdmin.permissions ? verifiedAdmin.permissions.length : 0}`);
      }
      
    } else {
      console.log('❌ No admin user found');
      console.log('Please create admin user first using createAdminUser script');
      return;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export functions
export { assignAllPermissionsToAdmin, createOrUpdateAdminWithAllPermissions };

// Run based on command line argument
const action = process.argv[2] || 'assign';

if (action === 'create-or-update') {
  createOrUpdateAdminWithAllPermissions();
} else {
  assignAllPermissionsToAdmin();
}