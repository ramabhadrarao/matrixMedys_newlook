import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSeeder() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Check if admin user exists, create if not
    console.log('👤 Checking admin user...');
    let adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      adminUser = new User({
        name: 'System Administrator',
        email: 'admin@matrixmedys.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        createdBy: null
      });
      
      await adminUser.save();
      console.log('✅ Admin user created:', adminUser.email);
    } else {
      console.log('✅ Admin user already exists:', adminUser.email);
    }
    
    // Create default portfolio first (needed for principal)
    console.log('📋 Checking default portfolio...');
    let portfolio = await Portfolio.findOne({ name: 'Essential Medicines' });
    if (!portfolio) {
      portfolio = new Portfolio({
        name: 'Essential Medicines',
        description: 'Essential pharmaceutical products portfolio',
        isActive: true,
        createdBy: adminUser._id
      });
      await portfolio.save();
      console.log('✅ Portfolio created:', portfolio.name);
    } else {
      console.log('✅ Portfolio already exists:', portfolio.name);
    }
    
    // Create default principal second
    console.log('🏢 Checking default principal...');
    let principal = await Principal.findOne({ gstNumber: '27ABCDE1234F1Z5' });
    if (!principal) {
      principal = new Principal({
        name: 'Matrix Pharmaceuticals',
        portfolio: [portfolio._id],
        gstNumber: '27ABCDE1234F1Z5',
        panNumber: 'ABCDE1234F',
        email: 'contact@matrixpharma.com',
        mobile: '+91-9876543210',
        isActive: true,
        createdBy: adminUser._id
      });
      await principal.save();
      console.log('✅ Principal created:', principal.name);
    } else {
      console.log('✅ Principal already exists:', principal.name);
    }

    
    // Create default category last (requires principal and portfolio)
    console.log('📂 Checking default category...');
    let category = await Category.findOne({ name: 'General Medicine' });
    if (!category) {
      category = new Category({
        name: 'General Medicine',
        description: 'General medical products and pharmaceuticals',
        principal: principal._id,
        portfolio: portfolio._id,
        isActive: true,
        createdBy: adminUser._id
      });
      await category.save();
      console.log('✅ Category created:', category.name);
    } else {
      console.log('✅ Category already exists:', category.name);
    }
    
    // Create sample products
    console.log('💊 Creating sample products...');
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
      }
    ];
    
    let createdCount = 0;
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
        console.log(`✅ Product created: ${product.name} (${product.code})`);
        createdCount++;
      } else {
        console.log(`⚠️  Product already exists: ${existingProduct.name} (${existingProduct.code})`);
      }
    }
    
    console.log('=====================================');
    console.log('🎉 Test seeding completed successfully!');
    console.log('📧 Login: admin@matrixmedys.com');
    console.log('🔑 Password: Admin@123');
    console.log(`💊 Products created: ${createdCount}`);
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Test seeding failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
}

testSeeder();