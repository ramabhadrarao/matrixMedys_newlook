import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';

dotenv.config();

const permissions = [
  // Category permissions
  {
    name: 'categories_view',
    description: 'View categories',
    resource: 'categories',
    action: 'view'
  },
  {
    name: 'categories_create',
    description: 'Create categories',
    resource: 'categories',
    action: 'create'
  },
  {
    name: 'categories_update',
    description: 'Update categories',
    resource: 'categories',
    action: 'update'
  },
  {
    name: 'categories_delete',
    description: 'Delete categories',
    resource: 'categories',
    action: 'delete'
  },
  // Product permissions
  {
    name: 'products_view',
    description: 'View products',
    resource: 'products',
    action: 'view'
  },
  {
    name: 'products_create',
    description: 'Create products',
    resource: 'products',
    action: 'create'
  },
  {
    name: 'products_update',
    description: 'Update products',
    resource: 'products',
    action: 'update'
  },
  {
    name: 'products_delete',
    description: 'Delete products',
    resource: 'products',
    action: 'delete'
  }
];

async function seedPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techcorp_auth');
    console.log('Connected to MongoDB');

    for (const permission of permissions) {
      const exists = await Permission.findOne({ name: permission.name });
      if (!exists) {
        await Permission.create(permission);
        console.log(`Created permission: ${permission.name}`);
      } else {
        console.log(`Permission already exists: ${permission.name}`);
      }
    }

    console.log('✅ Category and Product permissions seeded successfully');
  } catch (error) {
    console.error('Error seeding permissions:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedPermissions();