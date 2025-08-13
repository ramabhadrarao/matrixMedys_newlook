import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techcorp_auth');
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    console.log('\nTotal users:', users.length);
    
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Active: ${u.isActive}, Created: ${u.createdAt}`);
    });
    
    // Check specific admin user
    const admin = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (admin) {
      console.log('\n✅ Admin user found:', admin.email);
      const isValid = await admin.comparePassword('Admin@123');
      console.log('Password test result:', isValid);
    } else {
      console.log('\n❌ Admin user NOT found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkAdmin();
