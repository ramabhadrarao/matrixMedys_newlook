import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkflowStage from '../models/WorkflowStage.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const updatePOStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the PO we want to update
    const poId = '68e3b6ba495c20063fc1a2a5';
    const purchaseOrder = await PurchaseOrder.findById(poId);
    
    if (!purchaseOrder) {
      console.log('Purchase order not found');
      return;
    }

    console.log('Current PO status:', purchaseOrder.status);
    console.log('Current PO stage:', purchaseOrder.currentStage);

    // Find the ORDERED stage
    const orderedStage = await WorkflowStage.findOne({ code: 'ORDERED' });
    
    if (!orderedStage) {
      console.log('ORDERED stage not found');
      return;
    }

    // Update the purchase order
    purchaseOrder.status = 'ordered';
    purchaseOrder.currentStage = orderedStage._id;
    purchaseOrder.updatedBy = purchaseOrder.createdBy; // Use creator as updater

    // Add to workflow history
    purchaseOrder.workflowHistory.push({
      stage: orderedStage._id,
      action: 'ordered',
      actionBy: purchaseOrder.createdBy,
      actionDate: new Date(),
      remarks: 'Manually updated status to ordered for testing invoice receiving'
    });

    await purchaseOrder.save();

    console.log('Purchase order updated successfully!');
    console.log('New status:', purchaseOrder.status);
    console.log('New stage:', orderedStage.name);

  } catch (error) {
    console.error('Error updating PO status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

updatePOStatus();