import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import UserPermission from './models/UserPermission.js';
import Permission from './models/Permission.js';

dotenv.config();

async function checkUserPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys');
    console.log('Connected to MongoDB');
    
    const users = await User.find({}).select('name email');
    console.log('Users:', users);
    
    for (const user of users) {
      const userPerms = await UserPermission.find({ userId: user._id }).populate('permissionId');
      console.log(`\nUser: ${user.name} (${user.email})`);
      console.log('Permissions:', userPerms.map(up => `${up.permissionId.resource}:${up.permissionId.action}`));
    }
    
    // Check specifically for invoice_receiving permissions
    const invoicePerms = await Permission.find({ resource: 'invoice_receiving' });
    console.log('\nInvoice Receiving Permissions in DB:');
    invoicePerms.forEach(perm => {
      console.log(`- ${perm.name}: ${perm.resource}:${perm.action}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserPermissions();