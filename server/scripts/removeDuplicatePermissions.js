// server/scripts/removeDuplicatePermissions.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';

dotenv.config();

async function removeDuplicatePermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all permissions grouped by resource and action
    const duplicateCheck = await Permission.aggregate([
      {
        $group: {
          _id: { resource: "$resource", action: "$action" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Found ${duplicateCheck.length} sets of duplicate permissions:`);
    
    let totalRemoved = 0;
    
    for (const duplicate of duplicateCheck) {
      const { resource, action } = duplicate._id;
      const duplicateIds = duplicate.ids;
      const docs = duplicate.docs;
      
      console.log(`\nProcessing duplicates for ${resource}:${action}`);
      console.log(`Found ${docs.length} duplicates:`);
      
      // Show all duplicates
      docs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ID: ${doc._id}, Name: ${doc.name}, Created: ${doc.createdAt}`);
      });
      
      // Keep the first one (oldest), remove the rest
      const toKeep = duplicateIds[0];
      const toRemove = duplicateIds.slice(1);
      
      console.log(`Keeping: ${toKeep}`);
      console.log(`Removing: ${toRemove.join(', ')}`);
      
      // Remove duplicates
      const deleteResult = await Permission.deleteMany({ 
        _id: { $in: toRemove } 
      });
      
      console.log(`Removed ${deleteResult.deletedCount} duplicate permissions`);
      totalRemoved += deleteResult.deletedCount;
    }
    
    if (duplicateCheck.length === 0) {
      console.log('\nNo duplicate permissions found!');
    } else {
      console.log(`\nCleanup completed! Removed ${totalRemoved} duplicate permissions total.`);
    }
    
    // Verify final state
    console.log('\nVerifying final permission counts by resource:');
    const finalCount = await Permission.aggregate([
      {
        $group: {
          _id: "$resource",
          actions: { $push: "$action" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          resource: "$_id",
          actions: 1,
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { resource: 1 }
      }
    ]);
    
    finalCount.forEach(resource => {
      console.log(`${resource.resource}: ${resource.actions.join(', ')} (${resource.count} permissions)`);
    });
    
    const totalPermissions = await Permission.countDocuments();
    console.log(`\nTotal permissions after cleanup: ${totalPermissions}`);
    
  } catch (error) {
    console.error('Error removing duplicate permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Advanced cleanup function that also fixes permission names
async function advancedCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for advanced cleanup');
    
    // First remove exact duplicates
    await removeDuplicatePermissions();
    
    // Then standardize permission names
    console.log('\nStandardizing permission names...');
    
    const permissions = await Permission.find({});
    let updated = 0;
    
    for (const permission of permissions) {
      // Generate standard name format: resource_action
      const standardName = `${permission.resource}_${permission.action}`;
      
      if (permission.name !== standardName) {
        console.log(`Updating permission name: "${permission.name}" -> "${standardName}"`);
        
        await Permission.findByIdAndUpdate(permission._id, {
          name: standardName
        });
        updated++;
      }
    }
    
    console.log(`Updated ${updated} permission names to standard format`);
    
    // Final verification
    console.log('\nFinal verification - All permissions:');
    const allPermissions = await Permission.find({}).sort({ resource: 1, action: 1 });
    const resourceGroups = {};
    
    allPermissions.forEach(perm => {
      if (!resourceGroups[perm.resource]) {
        resourceGroups[perm.resource] = [];
      }
      resourceGroups[perm.resource].push(perm.action);
    });
    
    Object.keys(resourceGroups).sort().forEach(resource => {
      console.log(`${resource}: ${resourceGroups[resource].join(', ')}`);
    });
    
    console.log(`\nTotal permissions: ${allPermissions.length}`);
    
  } catch (error) {
    console.error('Error in advanced cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Export functions for use
export { removeDuplicatePermissions, advancedCleanup };

// Run the appropriate function based on command line argument
const runType = process.argv[2] || 'basic';

if (runType === 'advanced') {
  advancedCleanup();
} else {
  removeDuplicatePermissions();
}