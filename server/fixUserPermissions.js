import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import UserPermission from './models/UserPermission.js';
import Permission from './models/Permission.js';

dotenv.config();

async function fixUserPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys');
    console.log('Connected to MongoDB');
    
    // Get all invoice_receiving permissions
    const invoicePermissions = await Permission.find({ resource: 'invoice_receiving' });
    const permissionMap = new Map();
    invoicePermissions.forEach(perm => {
      permissionMap.set(perm.action, perm._id);
    });
    
    console.log('Available invoice_receiving permissions:', Array.from(permissionMap.keys()));
    
    // Fix Warehouse Manager permissions
    const warehouseManager = await User.findOne({ email: 'warehouse@matrixmedys.com' });
    if (warehouseManager) {
      console.log('\nFixing Warehouse Manager permissions...');
      
      // Add missing permissions: view, update, qc_submit
      const warehousePermissions = ['view', 'update', 'qc_submit'];
      
      for (const action of warehousePermissions) {
        const permissionId = permissionMap.get(action);
        if (permissionId) {
          // Check if permission already exists
          const existing = await UserPermission.findOne({
            userId: warehouseManager._id,
            permissionId: permissionId
          });
          
          if (!existing) {
            await UserPermission.create({
              userId: warehouseManager._id,
              permissionId: permissionId
            });
            console.log(`  ✅ Added invoice_receiving:${action}`);
          } else {
            console.log(`  ⚠️  Already has invoice_receiving:${action}`);
          }
        }
      }
    }
    
    // Fix QC Manager permissions
    const qcManager = await User.findOne({ email: 'qc@matrixmedys.com' });
    if (qcManager) {
      console.log('\nFixing QC Manager permissions...');
      
      // Add missing permissions: view, qc_check, qc_approve, qc_reject
      const qcPermissions = ['view', 'qc_check', 'qc_approve', 'qc_reject'];
      
      for (const action of qcPermissions) {
        const permissionId = permissionMap.get(action);
        if (permissionId) {
          // Check if permission already exists
          const existing = await UserPermission.findOne({
            userId: qcManager._id,
            permissionId: permissionId
          });
          
          if (!existing) {
            await UserPermission.create({
              userId: qcManager._id,
              permissionId: permissionId
            });
            console.log(`  ✅ Added invoice_receiving:${action}`);
          } else {
            console.log(`  ⚠️  Already has invoice_receiving:${action}`);
          }
        }
      }
    }
    
    console.log('\n✅ User permissions updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserPermissions();