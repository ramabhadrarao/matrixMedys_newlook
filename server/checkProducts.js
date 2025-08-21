import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Principal from './models/Principal.js';
import Portfolio from './models/Portfolio.js';

dotenv.config();

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const products = await Product.find()
      .populate('category')
      .populate('principal')
      .populate('portfolio');
    
    console.log(`\nProducts found: ${products.length}`);
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. Product: ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Category: ${product.category?.name || 'No category'}`);
      console.log(`   Principal: ${product.principal?.name || 'No principal'}`);
      console.log(`   Portfolio: ${product.portfolio?.name || 'No portfolio'}`);
      console.log(`   Price: ${product.price}`);
      console.log(`   Stock: ${product.stock}`);
    });
    
    // Also check raw data without population
    const rawProducts = await Product.find();
    console.log(`\nRaw products (without population): ${rawProducts.length}`);
    
    rawProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. Raw Product: ${product.name}`);
      console.log(`   Category ID: ${product.category}`);
      console.log(`   Principal ID: ${product.principal}`);
      console.log(`   Portfolio ID: ${product.portfolio}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkProducts();