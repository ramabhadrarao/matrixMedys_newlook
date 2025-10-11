// Check QC Status Script
import mongoose from 'mongoose';
import QualityControl from './models/QualityControl.js';
import InvoiceReceiving from './models/InvoiceReceiving.js';
import User from './models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

async function checkQCStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys');
    console.log('✅ Connected to MongoDB');

    // Get all QC records
    const qcRecords = await QualityControl.find({})
      .populate('invoiceReceiving', 'invoiceNumber')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\n📋 Found ${qcRecords.length} QC records:\n`);

    qcRecords.forEach((qc, index) => {
      console.log(`--- QC Record ${index + 1} ---`);
      console.log(`QC Number: ${qc.qcNumber}`);
      console.log(`Status: ${qc.status}`);
      console.log(`Overall Result: ${qc.overallResult}`);
      console.log(`Products Count: ${qc.products?.length || 0}`);
      
      if (qc.products && qc.products.length > 0) {
        console.log(`Product Status Details:`);
        qc.products.forEach((product, pIndex) => {
          console.log(`  Product ${pIndex + 1}:`);
          console.log(`    Name: ${product.productName}`);
          console.log(`    Overall Status: ${product.overallStatus}`);
          console.log(`    Passed Qty: ${product.passedQty}`);
          console.log(`    Failed Qty: ${product.failedQty}`);
        });
      }

      // Check canSendToWarehouse conditions
      const hasCompletedStatus = qc.status === 'completed';
      const hasPassedProducts = qc.products?.some(p => 
        p.overallStatus === 'passed' || p.overallStatus === 'partial_pass'
      ) || false;

      console.log(`\n🔍 Button Visibility Check:`);
      console.log(`  ✓ Status is 'completed': ${hasCompletedStatus}`);
      console.log(`  ✓ Has passed/partial_pass products: ${hasPassedProducts}`);
      console.log(`  🎯 Should show button: ${hasCompletedStatus && hasPassedProducts}`);
      
      console.log(`\n`);
    });

    // Check for any QC records that should show the button
    const completedQCs = await QualityControl.find({ status: 'completed' });
    console.log(`\n📊 Summary:`);
    console.log(`Total QC records: ${qcRecords.length}`);
    console.log(`Completed QC records: ${completedQCs.length}`);
    
    if (completedQCs.length > 0) {
      console.log(`\nCompleted QC records that should show warehouse button:`);
      completedQCs.forEach(qc => {
        const hasPassedProducts = qc.products?.some(p => 
          p.overallStatus === 'passed' || p.overallStatus === 'partial_pass'
        ) || false;
        
        if (hasPassedProducts) {
          console.log(`  - ${qc.qcNumber}: ✅ Should show button`);
        } else {
          console.log(`  - ${qc.qcNumber}: ❌ No passed products`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkQCStatus();