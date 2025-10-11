// server/seeders/permissionSeeder.js
import mongoose from 'mongoose';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const permissions = [
  // States permissions
  { 
    name: 'View States', 
    description: 'Can view states list and details', 
    resource: 'states', 
    action: 'view' 
  },
  { 
    name: 'Create States', 
    description: 'Can create new states', 
    resource: 'states', 
    action: 'create' 
  },
  { 
    name: 'Update States', 
    description: 'Can update existing states', 
    resource: 'states', 
    action: 'update' 
  },
  { 
    name: 'Delete States', 
    description: 'Can delete states', 
    resource: 'states', 
    action: 'delete' 
  },
  
  // Users permissions
  { 
    name: 'View Users', 
    description: 'Can view users list and details', 
    resource: 'users', 
    action: 'view' 
  },
  { 
    name: 'Create Users', 
    description: 'Can create new users', 
    resource: 'users', 
    action: 'create' 
  },
  { 
    name: 'Update Users', 
    description: 'Can update existing users', 
    resource: 'users', 
    action: 'update' 
  },
  { 
    name: 'Delete Users', 
    description: 'Can delete users', 
    resource: 'users', 
    action: 'delete' 
  },
  
  // Hospitals permissions
  {
    name: 'View Hospitals',
    description: 'Can view list of hospitals and their details',
    resource: 'hospitals',
    action: 'view',
  },
  {
    name: 'Create Hospitals',
    description: 'Can create new hospitals',
    resource: 'hospitals',
    action: 'create',
  },
  {
    name: 'Update Hospitals',
    description: 'Can update existing hospitals',
    resource: 'hospitals',
    action: 'update',
  },
  {
    name: 'Delete Hospitals',
    description: 'Can delete hospitals',
    resource: 'hospitals',
    action: 'delete',
  },
  
  // Doctors permissions
  {
    name: 'View Doctors',
    description: 'Can view list of doctors and their details',
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
  
  // Portfolios permissions
  {
    name: 'View Portfolios',
    description: 'Can view list of portfolios and their details',
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
  
  // Principals permissions
  {
    name: 'View Principals',
    description: 'Can view list of principals and their details',
    resource: 'principals',
    action: 'view',
  },
  {
    name: 'Create Principals',
    description: 'Can create new principals',
    resource: 'principals',
    action: 'create',
  },
  {
    name: 'Update Principals',
    description: 'Can update existing principals',
    resource: 'principals',
    action: 'update',
  },
  {
    name: 'Delete Principals',
    description: 'Can delete principals',
    resource: 'principals',
    action: 'delete',
  },
  
  // Branches permissions
  {
    name: 'View Branches',
    description: 'Can view list of branches and their details',
    resource: 'branches',
    action: 'view',
  },
  {
    name: 'Create Branches',
    description: 'Can create new branches',
    resource: 'branches',
    action: 'create',
  },
  {
    name: 'Update Branches',
    description: 'Can update existing branches',
    resource: 'branches',
    action: 'update',
  },
  {
    name: 'Delete Branches',
    description: 'Can delete branches',
    resource: 'branches',
    action: 'delete',
  },
  
  // Warehouses permissions
  {
    name: 'View Warehouses',
    description: 'Can view list of warehouses and their details',
    resource: 'warehouses',
    action: 'view',
  },
  {
    name: 'Create Warehouses',
    description: 'Can create new warehouses',
    resource: 'warehouses',
    action: 'create',
  },
  {
    name: 'Update Warehouses',
    description: 'Can update existing warehouses',
    resource: 'warehouses',
    action: 'update',
  },
  {
    name: 'Delete Warehouses',
    description: 'Can delete warehouses',
    resource: 'warehouses',
    action: 'delete',
  },
  
  // Permissions module permissions
  {
    name: 'View Permissions',
    description: 'Can view permissions list and details',
    resource: 'permissions',
    action: 'view',
  },
  {
    name: 'Create Permissions',
    description: 'Can create new permissions',
    resource: 'permissions',
    action: 'create',
  },
  {
    name: 'Update Permissions',
    description: 'Can update existing permissions',
    resource: 'permissions',
    action: 'update',
  },
  {
    name: 'Delete Permissions',
    description: 'Can delete permissions',
    resource: 'permissions',
    action: 'delete',
  },

  // Quality Control permissions
  {
    name: 'View Quality Control',
    description: 'Can view quality control records and details',
    resource: 'quality_control',
    action: 'view',
  },
  {
    name: 'Create Quality Control',
    description: 'Can create new quality control records',
    resource: 'quality_control',
    action: 'create',
  },
  {
    name: 'Update Quality Control',
    description: 'Can update quality control item details and status',
    resource: 'quality_control',
    action: 'update',
  },
  {
    name: 'Submit Quality Control',
    description: 'Can submit quality control for approval',
    resource: 'quality_control',
    action: 'submit',
  },
  {
    name: 'Approve Quality Control',
    description: 'Can approve or reject quality control records',
    resource: 'quality_control',
    action: 'approve',
  },
  {
    name: 'View QC Statistics',
    description: 'Can view quality control statistics and reports',
    resource: 'quality_control',
    action: 'statistics',
  },

  // Warehouse Approval permissions
  {
    name: 'View Warehouse Approval',
    description: 'Can view warehouse approval records and details',
    resource: 'warehouse_approval',
    action: 'view',
  },
  {
    name: 'Update Warehouse Approval',
    description: 'Can update warehouse approval product checks',
    resource: 'warehouse_approval',
    action: 'update',
  },
  {
    name: 'Submit Warehouse Approval',
    description: 'Can submit warehouse approval for manager review',
    resource: 'warehouse_approval',
    action: 'submit',
  },
  {
    name: 'Approve Warehouse Approval',
    description: 'Can approve or reject warehouse approval as manager',
    resource: 'warehouse_approval',
    action: 'approve',
  },
  {
    name: 'View Warehouse Statistics',
    description: 'Can view warehouse approval statistics and reports',
    resource: 'warehouse_approval',
    action: 'statistics',
  },

  // Inventory Management permissions
  {
    name: 'View Inventory',
    description: 'Can view inventory records and stock levels',
    resource: 'inventory',
    action: 'view',
  },
  {
    name: 'Update Inventory',
    description: 'Can update inventory record details',
    resource: 'inventory',
    action: 'update',
  },
  {
    name: 'Adjust Stock',
    description: 'Can adjust inventory stock levels (add/remove)',
    resource: 'inventory',
    action: 'adjust',
  },
  {
    name: 'Reserve Stock',
    description: 'Can reserve and release inventory stock',
    resource: 'inventory',
    action: 'reserve',
  },
  {
    name: 'Transfer Stock',
    description: 'Can transfer stock between warehouses/locations',
    resource: 'inventory',
    action: 'transfer',
  },
  {
    name: 'Record Utilization',
    description: 'Can record stock utilization to hospitals/patients',
    resource: 'inventory',
    action: 'utilize',
  },
  {
    name: 'View Inventory Statistics',
    description: 'Can view inventory statistics and stock reports',
    resource: 'inventory',
    action: 'statistics',
  },
  {
    name: 'View Stock Movement',
    description: 'Can view stock movement history and audit trail',
    resource: 'inventory',
    action: 'movement_history',
  },
];

const seedPermissions = async () => {
  try {
    await connectDB();
    
    console.log('Starting permission seeding...');
    console.log(`Total permissions to check/create: ${permissions.length}`);
    
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const allPermissionIds = [];
    
    // Process each permission
    for (const permData of permissions) {
      const existingPermission = await Permission.findOne({
        resource: permData.resource,
        action: permData.action
      });
      
      if (existingPermission) {
        // Check if update is needed
        if (existingPermission.name !== permData.name || 
            existingPermission.description !== permData.description) {
          existingPermission.name = permData.name;
          existingPermission.description = permData.description;
          await existingPermission.save();
          console.log(`✅ Updated: ${permData.name}`);
          updated++;
        } else {
          console.log(`⏭️  Unchanged: ${permData.name}`);
          unchanged++;
        }
        allPermissionIds.push(existingPermission._id);
      } else {
        // Create new permission
        const newPermission = await Permission.create(permData);
        console.log(`✨ Created: ${permData.name}`);
        created++;
        allPermissionIds.push(newPermission._id);
      }
    }
    
    // Summary of permission changes
    console.log('\n📊 Permission Summary:');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Unchanged: ${unchanged}`);
    console.log(`  Total: ${permissions.length}`);
    
    // Find admin user by email
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    
    if (adminUser) {
      console.log(`\n👤 Found admin user: ${adminUser.email}`);
      
      // Get existing user permissions
      const existingUserPermissions = await UserPermission.find({ 
        userId: adminUser._id 
      }).select('permissionId');
      
      const existingPermissionIds = existingUserPermissions.map(up => 
        up.permissionId.toString()
      );
      
      // Find missing permissions
      const missingPermissionIds = allPermissionIds.filter(permId => 
        !existingPermissionIds.includes(permId.toString())
      );
      
      if (missingPermissionIds.length > 0) {
        // Add only missing permissions
        const newUserPermissions = missingPermissionIds.map(permissionId => ({
          userId: adminUser._id,
          permissionId: permissionId,
        }));
        
        await UserPermission.insertMany(newUserPermissions);
        console.log(`✅ Added ${missingPermissionIds.length} new permissions to admin`);
        
        // Show which permissions were added
        const addedPermissions = await Permission.find({ 
          _id: { $in: missingPermissionIds } 
        }).select('name resource action');
        
        console.log('\n🆕 Newly assigned permissions:');
        addedPermissions.forEach(perm => {
          console.log(`  - ${perm.name} (${perm.resource}:${perm.action})`);
        });
      } else {
        console.log('✅ Admin already has all permissions');
      }
      
      // Final count
      const totalAdminPermissions = await UserPermission.countDocuments({ 
        userId: adminUser._id 
      });
      console.log(`\n📋 Admin total permissions: ${totalAdminPermissions}`);
      
    } else {
      console.log('\n⚠️  Warning: Admin user not found!');
      console.log('   Please create admin user first:');
      console.log('   Run: node server/fix-admin-password.js');
    }
    
    // Show all resources
    const allResources = await Permission.distinct('resource');
    console.log('\n🗂️  All resources with permissions:', allResources.join(', '));
    
    console.log('\n🎉 Permission seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    process.exit(1);
  }
};

seedPermissions();