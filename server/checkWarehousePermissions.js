import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import UserPermission from './models/UserPermission.js';
import Permission from './models/Permission.js';

dotenv.config();

async function checkWarehousePermissions() {
  try {
    // Connect to the specific database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Matryx_Medizys_15092025');
    console.log('Connected to MongoDB - Matryx_Medizys_15092025');
    
    // Check all warehouse approval permissions
    console.log('\n=== Warehouse Approval Permissions in Database ===');
    const warehousePerms = await Permission.find({ resource: 'warehouse_approval' });
    if (warehousePerms.length === 0) {
      console.log('❌ No warehouse_approval permissions found in database');
    } else {
      warehousePerms.forEach(perm => {
        console.log(`✅ ${perm.name}: ${perm.resource}:${perm.action}`);
      });
    }
    
    // Find admin user
    console.log('\n=== Admin User Check ===');
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log(`✅ Admin user found: ${adminUser.name} (${adminUser.email})`);
    
    // Check admin permissions
    console.log('\n=== Admin User Permissions ===');
    const adminPerms = await UserPermission.find({ userId: adminUser._id }).populate('permissionId');
    
    if (adminPerms.length === 0) {
      console.log('❌ Admin user has no permissions assigned');
    } else {
      console.log(`Admin has ${adminPerms.length} permissions:`);
      adminPerms.forEach(up => {
        console.log(`- ${up.permissionId.name}: ${up.permissionId.resource}:${up.permissionId.action}`);
      });
      
      // Check specifically for warehouse_approval:create
      const hasWarehouseCreate = adminPerms.some(up => 
        up.permissionId.resource === 'warehouse_approval' && up.permissionId.action === 'create'
      );
      
      console.log(`\n🔍 Has warehouse_approval:create permission: ${hasWarehouseCreate ? '✅ YES' : '❌ NO'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWarehousePermissions();