import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';
import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample products data
const sampleProducts = [
  {
    name: 'Paracetamol 500mg',
    code: 'PARA500',
    gstPercentage: 12,
    specification: 'Pain relief and fever reducer',
    remarks: 'Common analgesic',
    unit: 'PCS',
    hsnCode: '30049099',
    barcode: '1234567890123',
    batchNo: 'BATCH001',
    mfgDate: new Date('2024-01-15'),
    expDate: new Date('2026-01-15'),
    mrp: 25.50,
    dealerPrice: 20.00,
    defaultDiscount: {
      type: 'percentage',
      value: 10
    },
    isActive: true
  },
  {
    name: 'Amoxicillin 250mg',
    code: 'AMOX250',
    gstPercentage: 12,
    specification: 'Antibiotic capsules',
    remarks: 'Prescription required',
    unit: 'PCS',
    hsnCode: '30049099',
    barcode: '1234567890124',
    batchNo: 'BATCH002',
    mfgDate: new Date('2024-02-01'),
    expDate: new Date('2026-02-01'),
    mrp: 45.75,
    dealerPrice: 38.00,
    defaultDiscount: {
      type: 'percentage',
      value: 15
    },
    isActive: true
  },
  {
    name: 'Vitamin D3 Tablets',
    code: 'VITD3',
    gstPercentage: 12,
    specification: 'Vitamin D3 supplement 1000 IU',
    remarks: 'Dietary supplement',
    unit: 'PCS',
    hsnCode: '21069099',
    barcode: '1234567890125',
    batchNo: 'BATCH003',
    mfgDate: new Date('2024-03-01'),
    expDate: new Date('2026-03-01'),
    mrp: 120.00,
    dealerPrice: 95.00,
    defaultDiscount: {
      type: 'amount',
      value: 10
    },
    isActive: true
  }
];

async function seedProducts() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Get or create default category, principal, and portfolio
    let category = await Category.findOne({ name: 'General Medicine' });
    if (!category) {
      category = await Category.create({
        name: 'General Medicine',
        description: 'General pharmaceutical products',
        isActive: true
      });
      console.log('✅ Created default category: General Medicine');
    }

    let principal = await Principal.findOne({ name: 'Default Principal' });
    if (!principal) {
      principal = await Principal.create({
        name: 'Default Principal',
        description: 'Default principal for seeded products',
        isActive: true
      });
      console.log('✅ Created default principal: Default Principal');
    }

    let portfolio = await Portfolio.findOne({ name: 'Default Portfolio' });
    if (!portfolio) {
      portfolio = await Portfolio.create({
        name: 'Default Portfolio',
        description: 'Default portfolio for seeded products',
        isActive: true
      });
      console.log('✅ Created default portfolio: Default Portfolio');
    }

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run comprehensive seeder first.');
      return;
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Create products
    let created = 0;
    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ code: productData.code });
      if (!existingProduct) {
        const product = await Product.create({
          ...productData,
          category: category._id,
          principal: principal._id,
          portfolio: portfolio._id,
          createdBy: adminUser._id
        });
        console.log(`✅ Created product: ${product.name} (${product.code})`);
        created++;
      } else {
        console.log(`⏭️  Product already exists: ${productData.name}`);
      }
    }

    console.log(`\n📊 Product Seeding Summary:`);
    console.log(`✨ Created: ${created} products`);
    console.log(`📦 Total products in database: ${await Product.countDocuments()}`);
    
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts();
}

export default seedProducts;