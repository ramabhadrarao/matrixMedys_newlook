import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Principal from '../models/Principal.js';
import Portfolio from '../models/Portfolio.js';
import User from '../models/User.js';

dotenv.config();

// Permissions for categories and products
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

// Sample category structure with multiple levels
const categoryStructure = [
  {
    name: 'Medical Equipment',
    description: 'All types of medical equipment and devices',
    children: [
      {
        name: 'Diagnostic Equipment',
        description: 'Equipment used for medical diagnosis',
        children: [
          {
            name: 'X-Ray Machines',
            description: 'Radiographic imaging equipment'
          },
          {
            name: 'Ultrasound Systems',
            description: 'Ultrasonic diagnostic equipment'
          },
          {
            name: 'ECG Machines',
            description: 'Electrocardiography equipment'
          },
          {
            name: 'Blood Pressure Monitors',
            description: 'Sphygmomanometers and digital BP monitors'
          }
        ]
      },
      {
        name: 'Surgical Instruments',
        description: 'Instruments used in surgical procedures',
        children: [
          {
            name: 'General Surgery',
            description: 'Basic surgical instruments'
          },
          {
            name: 'Orthopedic Instruments',
            description: 'Bone and joint surgery instruments'
          },
          {
            name: 'Cardiovascular Instruments',
            description: 'Heart and vascular surgery instruments'
          }
        ]
      },
      {
        name: 'Patient Monitoring',
        description: 'Equipment for monitoring patient vitals',
        children: [
          {
            name: 'Vital Signs Monitors',
            description: 'Multi-parameter patient monitors'
          },
          {
            name: 'Pulse Oximeters',
            description: 'Oxygen saturation monitors'
          }
        ]
      }
    ]
  },
  {
    name: 'Laboratory Equipment',
    description: 'Laboratory testing and analysis equipment',
    children: [
      {
        name: 'Clinical Chemistry',
        description: 'Chemistry analyzers and equipment',
        children: [
          {
            name: 'Biochemistry Analyzers',
            description: 'Automated chemistry analyzers'
          },
          {
            name: 'Electrolyte Analyzers',
            description: 'Ion selective electrode analyzers'
          }
        ]
      },
      {
        name: 'Hematology Equipment',
        description: 'Blood analysis equipment',
        children: [
          {
            name: 'Cell Counters',
            description: 'Automated blood cell counters'
          },
          {
            name: 'Coagulation Analyzers',
            description: 'Blood clotting analyzers'
          }
        ]
      },
      {
        name: 'Microbiology Equipment',
        description: 'Bacterial and viral testing equipment',
        children: [
          {
            name: 'Incubators',
            description: 'Laboratory incubators for culture growth'
          },
          {
            name: 'Autoclaves',
            description: 'Sterilization equipment'
          }
        ]
      }
    ]
  },
  {
    name: 'Consumables & Supplies',
    description: 'Medical consumables and supplies',
    children: [
      {
        name: 'Disposable Items',
        description: 'Single-use medical items',
        children: [
          {
            name: 'Syringes & Needles',
            description: 'Injection equipment'
          },
          {
            name: 'Gloves & PPE',
            description: 'Personal protective equipment'
          },
          {
            name: 'Catheters',
            description: 'Various types of catheters'
          }
        ]
      },
      {
        name: 'Reagents & Chemicals',
        description: 'Laboratory reagents and chemicals',
        children: [
          {
            name: 'Clinical Chemistry Reagents',
            description: 'Reagents for chemistry analyzers'
          },
          {
            name: 'Hematology Reagents',
            description: 'Reagents for blood analysis'
          }
        ]
      }
    ]
  }
];

// Sample products for different categories
const productTemplates = {
  'X-Ray Machines': [
    {
      name: 'Digital X-Ray System DXR-500',
      code: 'DXR-500',
      specification: 'High-resolution digital radiography system with 40kW generator',
      hsnCode: '90221200',
      unit: 'PCS',
      mrp: 1500000,
      dealerPrice: 1200000,
      gstPercentage: 12,
      batchNo: 'DXR2024001',
      defaultDiscount: { type: 'percentage', value: 5 }
    },
    {
      name: 'Portable X-Ray Unit PXR-100',
      code: 'PXR-100',
      specification: 'Mobile X-ray unit for bedside imaging',
      hsnCode: '90221200',
      unit: 'PCS',
      mrp: 800000,
      dealerPrice: 650000,
      gstPercentage: 12,
      batchNo: 'PXR2024001',
      defaultDiscount: { type: 'percentage', value: 3 }
    }
  ],
  'Ultrasound Systems': [
    {
      name: 'Color Doppler Ultrasound US-3000',
      code: 'US-3000',
      specification: '4D imaging with advanced Doppler capabilities',
      hsnCode: '90181300',
      unit: 'PCS',
      mrp: 2500000,
      dealerPrice: 2000000,
      gstPercentage: 12,
      batchNo: 'US2024001',
      defaultDiscount: { type: 'percentage', value: 8 }
    },
    {
      name: 'Portable Ultrasound Scanner US-Pocket',
      code: 'US-POCKET',
      specification: 'Handheld ultrasound device with wireless connectivity',
      hsnCode: '90181300',
      unit: 'PCS',
      mrp: 450000,
      dealerPrice: 380000,
      gstPercentage: 12,
      batchNo: 'USP2024001',
      defaultDiscount: { type: 'percentage', value: 4 }
    }
  ],
  'ECG Machines': [
    {
      name: '12-Channel ECG Machine ECG-1200',
      code: 'ECG-1200',
      specification: '12-lead ECG with interpretation software',
      hsnCode: '90181920',
      unit: 'PCS',
      mrp: 120000,
      dealerPrice: 95000,
      gstPercentage: 12,
      batchNo: 'ECG2024001',
      defaultDiscount: { type: 'percentage', value: 6 }
    },
    {
      name: 'Portable ECG Monitor ECG-Handy',
      code: 'ECG-HANDY',
      specification: 'Single-lead portable ECG with Bluetooth',
      hsnCode: '90181920',
      unit: 'PCS',
      mrp: 25000,
      dealerPrice: 20000,
      gstPercentage: 12,
      batchNo: 'ECGH2024001',
      defaultDiscount: { type: 'percentage', value: 2 }
    }
  ],
  'Blood Pressure Monitors': [
    {
      name: 'Automatic BP Monitor ABP-300',
      code: 'ABP-300',
      specification: 'Digital blood pressure monitor with memory',
      hsnCode: '90189010',
      unit: 'PCS',
      mrp: 8500,
      dealerPrice: 7000,
      gstPercentage: 12,
      batchNo: 'ABP2024001',
      defaultDiscount: { type: 'percentage', value: 10 }
    },
    {
      name: 'Mercury Sphygmomanometer MSP-Classic',
      code: 'MSP-CLASSIC',
      specification: 'Traditional mercury-based BP monitor',
      hsnCode: '90189010',
      unit: 'PCS',
      mrp: 4500,
      dealerPrice: 3800,
      gstPercentage: 12,
      batchNo: 'MSP2024001',
      defaultDiscount: { type: 'percentage', value: 5 }
    }
  ],
  'Biochemistry Analyzers': [
    {
      name: 'Automated Chemistry Analyzer BCA-500',
      code: 'BCA-500',
      specification: '500 tests per hour with 40 parameters',
      hsnCode: '90271000',
      unit: 'PCS',
      mrp: 3500000,
      dealerPrice: 2800000,
      gstPercentage: 12,
      batchNo: 'BCA2024001',
      defaultDiscount: { type: 'percentage', value: 7 }
    },
    {
      name: 'Semi-Auto Chemistry Analyzer SCA-200',
      code: 'SCA-200',
      specification: 'Semi-automated analyzer with 20 parameters',
      hsnCode: '90271000',
      unit: 'PCS',
      mrp: 850000,
      dealerPrice: 720000,
      gstPercentage: 12,
      batchNo: 'SCA2024001',
      defaultDiscount: { type: 'percentage', value: 4 }
    }
  ],
  'Cell Counters': [
    {
      name: '5-Part Differential Cell Counter CC-5000',
      code: 'CC-5000',
      specification: '5-part differential with 60 samples per hour',
      hsnCode: '90271000',
      unit: 'PCS',
      mrp: 1200000,
      dealerPrice: 980000,
      gstPercentage: 12,
      batchNo: 'CC2024001',
      defaultDiscount: { type: 'percentage', value: 6 }
    },
    {
      name: '3-Part Cell Counter CC-3000',
      code: 'CC-3000',
      specification: '3-part differential compact analyzer',
      hsnCode: '90271000',
      unit: 'PCS',
      mrp: 650000,
      dealerPrice: 550000,
      gstPercentage: 12,
      batchNo: 'CC3K2024001',
      defaultDiscount: { type: 'percentage', value: 3 }
    }
  ],
  'Syringes & Needles': [
    {
      name: 'Disposable Syringe 10ml',
      code: 'SYR-10ML',
      specification: '10ml disposable syringe with needle',
      hsnCode: '90183100',
      unit: 'BOX',
      mrp: 450,
      dealerPrice: 380,
      gstPercentage: 12,
      batchNo: 'SYR10-2024001',
      defaultDiscount: { type: 'percentage', value: 15 }
    },
    {
      name: 'Insulin Syringe 1ml',
      code: 'INS-1ML',
      specification: '1ml insulin syringe with ultra-fine needle',
      hsnCode: '90183100',
      unit: 'BOX',
      mrp: 320,
      dealerPrice: 270,
      gstPercentage: 12,
      batchNo: 'INS1-2024001',
      defaultDiscount: { type: 'percentage', value: 12 }
    },
    {
      name: 'IV Cannula 20G',
      code: 'IVC-20G',
      specification: '20 gauge IV cannula with injection port',
      hsnCode: '90183200',
      unit: 'BOX',
      mrp: 680,
      dealerPrice: 580,
      gstPercentage: 12,
      batchNo: 'IVC20-2024001',
      defaultDiscount: { type: 'percentage', value: 8 }
    }
  ],
  'Gloves & PPE': [
    {
      name: 'Nitrile Examination Gloves',
      code: 'GLV-NITRILE',
      specification: 'Powder-free nitrile gloves, size medium',
      hsnCode: '40151100',
      unit: 'BOX',
      mrp: 850,
      dealerPrice: 720,
      gstPercentage: 12,
      batchNo: 'NIT2024001',
      defaultDiscount: { type: 'percentage', value: 10 }
    },
    {
      name: 'Surgical Face Mask',
      code: 'MASK-SURG',
      specification: '3-ply surgical mask with ear loops',
      hsnCode: '63079000',
      unit: 'BOX',
      mrp: 280,
      dealerPrice: 240,
      gstPercentage: 12,
      batchNo: 'MSK2024001',
      defaultDiscount: { type: 'percentage', value: 18 }
    },
    {
      name: 'N95 Respirator Mask',
      code: 'N95-RESP',
      specification: 'N95 particulate respirator mask',
      hsnCode: '63079000',
      unit: 'BOX',
      mrp: 950,
      dealerPrice: 800,
      gstPercentage: 12,
      batchNo: 'N95-2024001',
      defaultDiscount: { type: 'percentage', value: 7 }
    }
  ],
  'General Surgery': [
    {
      name: 'Surgical Scissor Set',
      code: 'SURG-SCIS-SET',
      specification: 'Stainless steel surgical scissors set of 5',
      hsnCode: '90189090',
      unit: 'PACK',
      mrp: 12500,
      dealerPrice: 10500,
      gstPercentage: 12,
      batchNo: 'SSS2024001',
      defaultDiscount: { type: 'percentage', value: 5 }
    },
    {
      name: 'Surgical Forceps Set',
      code: 'SURG-FORC-SET',
      specification: 'Assorted surgical forceps set of 8',
      hsnCode: '90189090',
      unit: 'PACK',
      mrp: 18500,
      dealerPrice: 15500,
      gstPercentage: 12,
      batchNo: 'SFS2024001',
      defaultDiscount: { type: 'percentage', value: 4 }
    }
  ],
  'Pulse Oximeters': [
    {
      name: 'Fingertip Pulse Oximeter',
      code: 'OXIM-FINGER',
      specification: 'Digital fingertip pulse oximeter with OLED display',
      hsnCode: '90189010',
      unit: 'PCS',
      mrp: 2800,
      dealerPrice: 2400,
      gstPercentage: 12,
      batchNo: 'OXF2024001',
      defaultDiscount: { type: 'percentage', value: 12 }
    },
    {
      name: 'Handheld Pulse Oximeter',
      code: 'OXIM-HAND',
      specification: 'Professional handheld pulse oximeter',
      hsnCode: '90189010',
      unit: 'PCS',
      mrp: 8500,
      dealerPrice: 7200,
      gstPercentage: 12,
      batchNo: 'OXH2024001',
      defaultDiscount: { type: 'percentage', value: 6 }
    }
  ]
};

// Helper function to create categories recursively
async function createCategories(categoryData, principalId, portfolioId, userId, parentId = null, level = 0) {
  const createdCategories = [];
  
  for (let i = 0; i < categoryData.length; i++) {
    const catData = categoryData[i];
    
    // Create the category
    const category = new Category({
      name: catData.name,
      description: catData.description,
      principal: principalId,
      portfolio: portfolioId,
      parent: parentId,
      level: level,
      sortOrder: i + 1,
      isActive: true,
      createdBy: userId,
      hasChildren: catData.children && catData.children.length > 0,
      childrenCount: catData.children ? catData.children.length : 0
    });
    
    // Set path and ancestors
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (parent) {
        category.level = parent.level + 1;
        category.path = parent.path ? `${parent.path}/${parent.name}` : parent.name;
        category.ancestors = [...(parent.ancestors || []), parent._id];
      }
    }
    
    await category.save();
    createdCategories.push(category);
    
    console.log(`Created category: ${category.name} (Level ${category.level})`);
    
    // Create children if they exist
    if (catData.children && catData.children.length > 0) {
      const childCategories = await createCategories(
        catData.children, 
        principalId, 
        portfolioId, 
        userId, 
        category._id, 
        level + 1
      );
      createdCategories.push(...childCategories);
    }
  }
  
  return createdCategories;
}

// Helper function to create products for a category
async function createProductsForCategory(category, principalId, portfolioId, userId) {
  const categoryName = category.name;
  const productTemplatesForCategory = productTemplates[categoryName];
  
  if (!productTemplatesForCategory) {
    console.log(`No product templates found for category: ${categoryName}`);
    return [];
  }
  
  const createdProducts = [];
  
  for (const productTemplate of productTemplatesForCategory) {
    // Add some variation to the batch dates
    const mfgDate = new Date();
    mfgDate.setDate(mfgDate.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days
    
    const expDate = new Date(mfgDate);
    expDate.setFullYear(expDate.getFullYear() + Math.floor(Math.random() * 3) + 1); // 1-4 years from mfg
    
    const product = new Product({
      ...productTemplate,
      category: category._id,
      principal: principalId,
      portfolio: portfolioId,
      categoryPath: await category.getFullPath(),
      categoryAncestors: category.ancestors,
      mfgDate: mfgDate,
      expDate: expDate,
      createdBy: userId,
      isActive: true,
      documents: []
    });
    
    await product.save();
    createdProducts.push(product);
    
    console.log(`Created product: ${product.name} (${product.code}) in category: ${categoryName}`);
  }
  
  // Update category's product count
  await Category.findByIdAndUpdate(category._id, {
    productsCount: createdProducts.length
  });
  
  return createdProducts;
}

async function seedPermissions(options = { updateExisting: true }) {
  console.log('🔑 Seeding permissions...');
  
  for (const permission of permissions) {
    const exists = await Permission.findOne({ name: permission.name });
    
    if (!exists) {
      // Create new permission
      await Permission.create(permission);
      console.log(`✅ Created permission: ${permission.name}`);
    } else {
      if (options.updateExisting) {
        // Update existing permission
        await Permission.findOneAndUpdate(
          { name: permission.name },
          {
            description: permission.description,
            resource: permission.resource,
            action: permission.action
          },
          { new: true }
        );
        console.log(`🔄 Updated permission: ${permission.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permission.name}`);
      }
    }
  }
  
  console.log('✅ Permissions seeded successfully');
}

// Alternative: Upsert function (recommended for better performance)
async function upsertPermissions() {
  console.log('🔑 Upserting permissions...');
  
  for (const permission of permissions) {
    const result = await Permission.findOneAndUpdate(
      { name: permission.name }, // Find condition
      permission, // Update data
      { 
        new: true, // Return updated document
        upsert: true, // Create if doesn't exist
        runValidators: true // Run schema validators
      }
    );
    
    // Check if it was created or updated
    const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
    const action = wasCreated ? 'Created' : 'Updated';
    console.log(`${wasCreated ? '✅' : '🔄'} ${action} permission: ${permission.name}`);
  }
  
  console.log('✅ Permissions upserted successfully');
}

async function seedCategoriesAndProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techcorp_auth');
    console.log('🔗 Connected to MongoDB');
    
    // Seed permissions first (with update option)
    // Choose one of these approaches:
    
    // Option 1: Update existing permissions
    await seedPermissions({ updateExisting: true });
    
    // Option 2: Use upsert (recommended - faster and cleaner)
    // await upsertPermissions();
    
    // Get required data
    const principal = await Principal.findOne().sort({ createdAt: 1 });
    const portfolio = await Portfolio.findOne().sort({ createdAt: 1 });
    const user = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    
    if (!principal) {
      console.error('❌ No principal found. Please create a principal first.');
      return;
    }
    
    if (!portfolio) {
      console.error('❌ No portfolio found. Please create a portfolio first.');
      return;
    }
    
    if (!user) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }
    
    console.log(`📋 Using Principal: ${principal.name}`);
    console.log(`📁 Using Portfolio: ${portfolio.name}`);
    console.log(`👤 Using User: ${user.name || user.email}`);
    
    // Clear existing data for this principal/portfolio combination
    console.log('🧹 Clearing existing categories and products...');
    const existingCategories = await Category.find({ 
      principal: principal._id, 
      portfolio: portfolio._id 
    });
    
    for (const category of existingCategories) {
      await Product.deleteMany({ category: category._id });
    }
    
    await Category.deleteMany({ 
      principal: principal._id, 
      portfolio: portfolio._id 
    });
    
    console.log('🏗️ Creating categories...');
    const categories = await createCategories(
      categoryStructure, 
      principal._id, 
      portfolio._id, 
      user._id
    );
    
    console.log('📦 Creating products...');
    let totalProducts = 0;
    
    for (const category of categories) {
      const products = await createProductsForCategory(
        category, 
        principal._id, 
        portfolio._id, 
        user._id
      );
      totalProducts += products.length;
    }
    
    console.log('📊 Summary:');
    console.log(`✅ Created ${categories.length} categories`);
    console.log(`✅ Created ${totalProducts} products`);
    console.log('🎉 Categories and products seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding categories and products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeder
seedCategoriesAndProducts();