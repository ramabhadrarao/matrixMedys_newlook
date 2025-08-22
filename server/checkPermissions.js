import mongoose from 'mongoose';
import Permission from './models/Permission.js';

async function checkPermissions() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/Matryx_Medizys_17062025');
    console.log('Connected to MongoDB');
    
    const permissions = await Permission.find({}).sort({resource: 1, action: 1});
    console.log('\nAll permissions in database:');
    console.log('============================');
    
    const groupedPermissions = {};
    permissions.forEach(p => {
      if (!groupedPermissions[p.resource]) {
        groupedPermissions[p.resource] = [];
      }
      groupedPermissions[p.resource].push(p.action);
    });
    
    Object.keys(groupedPermissions).sort().forEach(resource => {
      console.log(`${resource}: ${groupedPermissions[resource].join(', ')}`);
    });
    
    console.log(`\nTotal permissions: ${permissions.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkPermissions();