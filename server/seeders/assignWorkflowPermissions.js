// server/seeders/assignWorkflowPermissions.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';

dotenv.config();

async function assignWorkflowPermissionsToAdmin() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('💡 Please run the comprehensive seeder first: npm run seed:comprehensive');
      process.exit(1);
    }
    
    console.log(`👤 Found admin user: ${adminUser.email}`);
    
    // Find all workflow-related permissions
    const workflowPermissions = await Permission.find({
      $or: [
        { resource: 'purchase_orders' },
        { resource: 'po_workflow' },
        { resource: 'po_receiving' },
        { resource: 'invoices' },
        { resource: 'workflow' },
        { resource: 'invoice_receiving' }
      ]
    });
    
    console.log(`🔍 Found ${workflowPermissions.length} workflow permissions`);
    
    if (workflowPermissions.length === 0) {
      console.log('⚠️  No workflow permissions found!');
      console.log('💡 Please run the workflow permissions seeder first: node seeders/workflowPermissionsSeeder.js');
      process.exit(1);
    }
    
    // Get existing user permissions
    const existingUserPermissions = await UserPermission.find({ 
      userId: adminUser._id 
    }).select('permissionId');
    
    const existingPermissionIds = existingUserPermissions.map(up => 
      up.permissionId.toString()
    );
    
    // Find missing permissions
    const missingPermissionIds = workflowPermissions.filter(perm => 
      !existingPermissionIds.includes(perm._id.toString())
    );
    
    if (missingPermissionIds.length > 0) {
      // Add only missing permissions
      const newUserPermissions = missingPermissionIds.map(permission => ({
        userId: adminUser._id,
        permissionId: permission._id,
      }));
      
      await UserPermission.insertMany(newUserPermissions);
      console.log(`✅ Added ${missingPermissionIds.length} new workflow permissions to admin`);
      
      // Show which permissions were added
      console.log('\n🆕 Newly assigned permissions:');
      missingPermissionIds.forEach(perm => {
        console.log(`  - ${perm.name} (${perm.resource}:${perm.action})`);
      });
    } else {
      console.log('✅ Admin already has all workflow permissions');
    }
    
    // Final count
    const totalAdminPermissions = await UserPermission.countDocuments({ 
      userId: adminUser._id 
    });
    console.log(`\n📋 Admin total permissions: ${totalAdminPermissions}`);
    
    console.log('\n🎉 Workflow permissions assignment completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning workflow permissions:', error);
    process.exit(1);
  }
}

assignWorkflowPermissionsToAdmin();