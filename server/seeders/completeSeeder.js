import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';
import Permission from '../models/Permission.js';
import UserPermission from '../models/UserPermission.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample data
const permissions = [
  { name: 'View Products', description: 'Can view products list and details', resource: 'products', action: 'view' },
  { name: 'Create Products', description: 'Can create new products', resource: 'products', action: 'create' },
  { name: 'Update Products', description: 'Can update existing products', resource: 'products', action: 'update' },
  { name: 'Delete Products', description: 'Can delete products', resource: 'products', action: 'delete' },
  { name: 'View Categories', description: 'Can view categories', resource: 'categories', action: 'view' },
  { name: 'Create Categories', description: 'Can create categories', resource: 'categories', action: 'create' },
  { name: 'View Principals', description: 'Can view principals', resource: 'principals', action: 'view' },
  { name: 'Create Principals', description: 'Can create principals', resource: 'principals', action: 'create' },
  { name: 'View Portfolios', description: 'Can view portfolios', resource: 'portfolios', action: 'view' },
  { name: 'Create Portfolios', description: 'Can create portfolios', resource: 'portfolios', action: 'create' }
];

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return existingAdmin;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@matrixmedys.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      createdBy: null
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

async function seedPermissions() {
  try {
    const createdPermissions = [];
    
    for (const permissionData of permissions) {
      const existingPermission = await Permission.findOne({ 
        name: permissionData.name 
      });
      
      if (!existingPermission) {
        const permission = new Permission(permissionData);
        await permission.save();
        createdPermissions.push(permission);
        console.log(`✅ Created permission: ${permission.name}`);
      } else {
        createdPermissions.push(existingPermission);
        console.log(`⚠️  Permission already exists: ${existingPermission.name}`);
      }
    }
    
    return createdPermissions;
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

async function assignPermissionsToAdmin(adminUser, createdPermissions) {
  try {
    for (const permission of createdPermissions) {
      const existingUserPermission = await UserPermission.findOne({
        userId: adminUser._id,
        permissionId: permission._id
      });
      
      if (!existingUserPermission) {
        const userPermission = new UserPermission({
          userId: adminUser._id,
          permissionId: permission._id,
          createdBy: adminUser._id
        });
        await userPermission.save();
        console.log(`✅ Assigned permission '${permission.name}' to admin`);
      }
    }
  } catch (error) {
    console.error('❌ Error assigning permissions to admin:', error);
    throw error;
  }
}

async function createDefaultCategory(adminUser) {
  try {
    let category = await Category.findOne({ name: 'General Medicine' });
    if (!category) {
      category = new Category({
        name: 'General Medicine',
        description: 'General medical products and pharmaceuticals',
        isActive: true,
        createdBy: adminUser._id
      });
      await category.save();
      console.log('✅ Created default category: General Medicine');
    }
    return category;
  } catch (error) {
    console.error('❌ Error creating default category:', error);
    throw error;
  }
}

async function createDefaultPrincipal(adminUser) {
  try {
    let principal = await Principal.findOne({ name: 'Matrix Pharmaceuticals' });
    if (!principal) {
      principal = new Principal({
        name: 'Matrix Pharmaceuticals',
        code: 'MATRIX001',
        contactPerson: 'John Doe',
        email: 'contact@matrixpharma.com',
        phone: '+91-9876543210',
        address: '123 Pharma Street, Mumbai, Maharashtra',
        isActive: true,
        createdBy: adminUser._id
      });
      await principal.save();
      console.log('✅ Created default principal: Matrix Pharmaceuticals');
    }
    return principal;
  } catch (error) {
    console.error('❌ Error creating default principal:', error);
    throw error;
  }
}

async function createDefaultPortfolio(adminUser) {
  try {
    let portfolio = await Portfolio.findOne({ name: 'Essential Medicines' });
    if (!portfolio) {
      portfolio = new Portfolio({
        name: 'Essential Medicines',
        description: 'Essential pharmaceutical products portfolio',
        isActive: true,
        createdBy: adminUser._id
      });
      await portfolio.save();
      console.log('✅ Created default portfolio: Essential Medicines');
    }
    return portfolio;
  } catch (error) {
    console.error('❌ Error creating default portfolio:', error);
    throw error;
  }
}

async function seedProducts(adminUser, category, principal, portfolio) {
  try {
    const sampleProducts = [
      {
        name: 'Paracetamol 500mg',
        code: 'PARA500',
        specification: 'Paracetamol 500mg tablets for fever and pain relief',
        hsnCode: '30049099',
        barcode: '1234567890123',
        batchNo: 'BATCH001',
        mfgDate: new Date('2024-01-15'),
        expDate: new Date('2026-01-15'),
        mrp: 25.50,
        dealerPrice: 20.00,
        gstPercentage: 12,
        defaultDiscount: 5,
        remarks: 'Popular pain reliever and fever reducer'
      },
      {
        name: 'Amoxicillin 250mg',
        code: 'AMOX250',
        specification: 'Amoxicillin 250mg capsules - Antibiotic',
        hsnCode: '30049011',
        barcode: '1234567890124',
        batchNo: 'BATCH002',
        mfgDate: new Date('2024-02-01'),
        expDate: new Date('2026-02-01'),
        mrp: 45.75,
        dealerPrice: 38.00,
        gstPercentage: 12,
        defaultDiscount: 8,
        remarks: 'Broad spectrum antibiotic'
      },
      {
        name: 'Vitamin D3 60K IU',
        code: 'VITD360K',
        specification: 'Cholecalciferol 60,000 IU soft gelatin capsules',
        hsnCode: '30049099',
        barcode: '1234567890125',
        batchNo: 'BATCH003',
        mfgDate: new Date('2024-03-01'),
        expDate: new Date('2027-03-01'),
        mrp: 85.00,
        dealerPrice: 70.00,
        gstPercentage: 12,
        defaultDiscount: 10,
        remarks: 'High potency Vitamin D3 supplement'
      },
      {
        name: 'Omeprazole 20mg',
        code: 'OMEP20',
        specification: 'Omeprazole 20mg enteric coated tablets',
        hsnCode: '30049099',
        barcode: '1234567890126',
        batchNo: 'BATCH004',
        mfgDate: new Date('2024-01-20'),
        expDate: new Date('2026-01-20'),
        mrp: 32.50,
        dealerPrice: 26.00,
        gstPercentage: 12,
        defaultDiscount: 6,
        remarks: 'Proton pump inhibitor for acid reflux'
      },
      {
        name: 'Cetirizine 10mg',
        code: 'CETI10',
        specification: 'Cetirizine Hydrochloride 10mg tablets',
        hsnCode: '30049099',
        barcode: '1234567890127',
        batchNo: 'BATCH005',
        mfgDate: new Date('2024-02-15'),
        expDate: new Date('2026-02-15'),
        mrp: 18.25,
        dealerPrice: 15.00,
        gstPercentage: 12,
        defaultDiscount: 4,
        remarks: 'Antihistamine for allergies'
      }
    ];

    const createdProducts = [];
    
    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ code: productData.code });
      
      if (!existingProduct) {
        const product = new Product({
          ...productData,
          category: category._id,
          principal: principal._id,
          portfolio: portfolio._id,
          isActive: true,
          createdBy: adminUser._id
        });
        
        await product.save();
        createdProducts.push(product);
        console.log(`✅ Created product: ${product.name} (${product.code})`);
      } else {
        console.log(`⚠️  Product already exists: ${existingProduct.name}`);
      }
    }
    
    return createdProducts;
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
}

async function completeSeeder() {
  try {
    await connectDB();
    console.log('🔗 Connected to MongoDB');
    console.log('=====================================');
    
    // Step 1: Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await createAdminUser();
    
    // Step 2: Seed permissions
    console.log('🔐 Seeding permissions...');
    const createdPermissions = await seedPermissions();
    
    // Step 3: Assign permissions to admin
    console.log('🎯 Assigning permissions to admin...');
    await assignPermissionsToAdmin(adminUser, createdPermissions);
    
    // Step 4: Create default category
    console.log('📂 Creating default category...');
    const category = await createDefaultCategory(adminUser);
    
    // Step 5: Create default principal
    console.log('🏢 Creating default principal...');
    const principal = await createDefaultPrincipal(adminUser);
    
    // Step 6: Create default portfolio
    console.log('📋 Creating default portfolio...');
    const portfolio = await createDefaultPortfolio(adminUser);
    
    // Step 7: Seed products
    console.log('💊 Seeding products...');
    const createdProducts = await seedProducts(adminUser, category, principal, portfolio);
    
    console.log('=====================================');
    console.log('🎉 Database seeded successfully!');
    console.log('=====================================');
    console.log('📋 Summary:');
    console.log(`   👤 Users: 1 (Admin)`);
    console.log(`   🔐 Permissions: ${createdPermissions.length}`);
    console.log(`   📂 Categories: 1`);
    console.log(`   🏢 Principals: 1`);
    console.log(`   📋 Portfolios: 1`);
    console.log(`   💊 Products: ${createdProducts.length}`);
    console.log('=====================================');
    console.log('🚀 You can now start using the application!');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('📧 Login: admin@matrixmedys.com');
    console.log('🔑 Password: Admin@123');
    console.log('=====================================');
    
  } catch (error) {
    console.error('💥 Complete seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeSeeder();
}

export default completeSeeder;