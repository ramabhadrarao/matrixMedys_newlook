import mongoose from 'mongoose';
import User from './models/User.js';
import Permission from './models/Permission.js';
import UserPermission from './models/UserPermission.js';
import dotenv from 'dotenv';

dotenv.config();

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techcorp_auth');
    console.log('Connected to MongoDB');
    
    // Find and update admin user
    const admin = await User.findOne({ email: 'admin@matrixmedys.com' });
    
    if (admin) {
      // Update password directly
      admin.password = 'Admin@123';
      admin.isActive = true;
      await admin.save();
      console.log('✅ Admin password updated');
      
      // Verify it works
      const updated = await User.findOne({ email: 'admin@matrixmedys.com' });
      const isValid = await updated.comparePassword('Admin@123');
      console.log('Password verification after update:', isValid);
      
      // Also ensure admin has all permissions
      const permissions = await Permission.find({});
      console.log(`\nFound ${permissions.length} permissions`);
      
      // Clear existing user permissions
      await UserPermission.deleteMany({ userId: admin._id });
      
      // Assign all permissions
      for (const permission of permissions) {
        await UserPermission.create({
          userId: admin._id,
          permissionId: permission._id
        });
      }
      console.log('✅ All permissions assigned to admin');
      
    } else {
      console.log('Admin not found, creating new one...');
      const newAdmin = new User({
        name: 'System Administrator',
        email: 'admin@matrixmedys.com',
        password: 'Admin@123',
        isActive: true
      });
      await newAdmin.save();
      console.log('✅ New admin created');
    }
    
    console.log('\n✨ Admin account ready!');
    console.log('Email: admin@matrixmedys.com');
    console.log('Password: Admin@123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

fixAdmin();
