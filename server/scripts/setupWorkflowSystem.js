// server/scripts/setupWorkflowSystem.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import WorkflowStage from '../models/WorkflowStage.js';
import WorkflowTransition from '../models/WorkflowTransition.js';
import User from '../models/User.js';
import UserPermission from '../models/UserPermission.js';

dotenv.config();

// Complete list of workflow permissions
const workflowPermissions = [
  // Purchase Order Basic Permissions
  { name: 'po_view', description: 'View purchase orders', resource: 'purchase_orders', action: 'view' },
  { name: 'po_create', description: 'Create purchase orders', resource: 'purchase_orders', action: 'create' },
  { name: 'po_edit', description: 'Edit purchase orders', resource: 'purchase_orders', action: 'update' },
  { name: 'po_delete', description: 'Delete purchase orders', resource: 'purchase_orders', action: 'delete' },
  
  // Workflow Actions
  { name: 'po_approve_level1', description: 'Approve PO - Level 1', resource: 'po_workflow', action: 'approve_level1' },
  { name: 'po_approve_level2', description: 'Approve PO - Level 2', resource: 'po_workflow', action: 'approve_level2' },
  { name: 'po_approve_final', description: 'Final PO Approval', resource: 'po_workflow', action: 'approve_final' },
  { name: 'po_reject', description: 'Reject purchase orders', resource: 'po_workflow', action: 'reject' },
  { name: 'po_return', description: 'Return PO for revision', resource: 'po_workflow', action: 'return' },
  { name: 'po_cancel', description: 'Cancel purchase orders', resource: 'po_workflow', action: 'cancel' },
  { name: 'po_send', description: 'Send PO to supplier', resource: 'po_workflow', action: 'send' },
  { name: 'po_complete', description: 'Mark PO as completed', resource: 'po_workflow', action: 'complete' },
  
  // Receiving Permissions
  { name: 'po_receive', description: 'Receive products against PO', resource: 'po_receiving', action: 'receive' },
  { name: 'po_qc_check', description: 'Perform QC check on received products', resource: 'po_receiving', action: 'qc_check' },
  { name: 'po_qc_approve', description: 'Approve QC results', resource: 'po_receiving', action: 'qc_approve' },
  { name: 'po_qc_reject', description: 'Reject QC results', resource: 'po_receiving', action: 'qc_reject' },
  
  // Invoice Receiving Permissions
  { name: 'invoice_receiving_view', description: 'View invoice receiving records', resource: 'invoice_receiving', action: 'view' },
  { name: 'invoice_receiving_create', description: 'Create invoice receiving records', resource: 'invoice_receiving', action: 'create' },
  { name: 'invoice_receiving_edit', description: 'Edit invoice receiving records', resource: 'invoice_receiving', action: 'update' },
  { name: 'invoice_receiving_delete', description: 'Delete invoice receiving records', resource: 'invoice_receiving', action: 'delete' },
  
  // Workflow Management
  { name: 'workflow_view', description: 'View workflow stages', resource: 'workflow', action: 'view' },
  { name: 'workflow_manage', description: 'Manage workflow stages', resource: 'workflow', action: 'manage' },
  { name: 'workflow_assign', description: 'Assign workflow permissions', resource: 'workflow', action: 'assign' },
];

// Workflow stages with proper configuration
const workflowStages = [
  {
    name: 'Draft',
    code: 'DRAFT',
    description: 'Initial PO creation and editing',
    sequence: 1,
    allowedActions: ['edit', 'cancel'],
    requiredPermissions: ['po_view', 'po_edit']
  },
  {
    name: 'Pending Approval - Level 1',
    code: 'PENDING_APPROVAL_L1',
    description: 'Awaiting first level approval',
    sequence: 2,
    allowedActions: ['approve', 'reject', 'return'],
    requiredPermissions: ['po_view', 'po_approve_level1']
  },
  {
    name: 'Pending Approval - Level 2',
    code: 'PENDING_APPROVAL_L2',
    description: 'Awaiting second level approval',
    sequence: 3,
    allowedActions: ['approve', 'reject', 'return'],
    requiredPermissions: ['po_view', 'po_approve_level2']
  },
  {
    name: 'Final Approval',
    code: 'APPROVED_FINAL',
    description: 'Final approval completed, ready to order',
    sequence: 4,
    allowedActions: ['send', 'cancel'],
    requiredPermissions: ['po_view', 'po_approve_final']
  },
  {
    name: 'Ordered',
    code: 'ORDERED',
    description: 'PO sent to supplier',
    sequence: 5,
    allowedActions: ['receive'],
    requiredPermissions: ['po_view', 'po_receive']
  },
  {
    name: 'Partial Received',
    code: 'PARTIAL_RECEIVED',
    description: 'Some products received',
    sequence: 6,
    allowedActions: ['receive', 'qc_check'],
    requiredPermissions: ['po_view', 'po_receive']
  },
  {
    name: 'Received',
    code: 'RECEIVED',
    description: 'All products received',
    sequence: 7,
    allowedActions: ['qc_check'],
    requiredPermissions: ['po_view', 'po_qc_check']
  },
  {
    name: 'QC Pending',
    code: 'QC_PENDING',
    description: 'Quality check in progress',
    sequence: 8,
    allowedActions: ['qc_check'],
    requiredPermissions: ['po_view', 'po_qc_check']
  },
  {
    name: 'QC Passed',
    code: 'QC_PASSED',
    description: 'Quality check passed',
    sequence: 9,
    allowedActions: ['complete'],
    requiredPermissions: ['po_view']
  },
  {
    name: 'QC Failed',
    code: 'QC_FAILED',
    description: 'Quality check failed',
    sequence: 10,
    allowedActions: ['return', 'reject'],
    requiredPermissions: ['po_view', 'po_qc_reject']
  },
  {
    name: 'Completed',
    code: 'COMPLETED',
    description: 'PO process completed',
    sequence: 11,
    allowedActions: [],
    requiredPermissions: ['po_view']
  },
  {
    name: 'Cancelled',
    code: 'CANCELLED',
    description: 'PO cancelled',
    sequence: 12,
    allowedActions: [],
    requiredPermissions: ['po_view']
  }
];

// Workflow transitions
const workflowTransitions = [
  // From DRAFT
  { fromStage: 'DRAFT', toStage: 'PENDING_APPROVAL_L1', action: 'approve', requiredFields: [] },
  { fromStage: 'DRAFT', toStage: 'CANCELLED', action: 'cancel', requiredFields: ['remarks'] },
  
  // From PENDING_APPROVAL_L1
  { fromStage: 'PENDING_APPROVAL_L1', toStage: 'PENDING_APPROVAL_L2', action: 'approve', requiredFields: [] },
  { fromStage: 'PENDING_APPROVAL_L1', toStage: 'DRAFT', action: 'return', requiredFields: ['remarks'] },
  { fromStage: 'PENDING_APPROVAL_L1', toStage: 'CANCELLED', action: 'reject', requiredFields: ['remarks'] },
  
  // From PENDING_APPROVAL_L2
  { fromStage: 'PENDING_APPROVAL_L2', toStage: 'APPROVED_FINAL', action: 'approve', requiredFields: [] },
  { fromStage: 'PENDING_APPROVAL_L2', toStage: 'PENDING_APPROVAL_L1', action: 'return', requiredFields: ['remarks'] },
  { fromStage: 'PENDING_APPROVAL_L2', toStage: 'CANCELLED', action: 'reject', requiredFields: ['remarks'] },
  
  // From APPROVED_FINAL
  { fromStage: 'APPROVED_FINAL', toStage: 'ORDERED', action: 'send', requiredFields: [] },
  { fromStage: 'APPROVED_FINAL', toStage: 'CANCELLED', action: 'cancel', requiredFields: ['remarks'] },
  
  // From ORDERED
  { fromStage: 'ORDERED', toStage: 'PARTIAL_RECEIVED', action: 'receive', requiredFields: ['products'] },
  { fromStage: 'ORDERED', toStage: 'RECEIVED', action: 'receive', requiredFields: ['products'] },
  
  // From PARTIAL_RECEIVED
  { fromStage: 'PARTIAL_RECEIVED', toStage: 'RECEIVED', action: 'receive', requiredFields: ['products'] },
  { fromStage: 'PARTIAL_RECEIVED', toStage: 'QC_PENDING', action: 'qc_check', requiredFields: [] },
  
  // From RECEIVED
  { fromStage: 'RECEIVED', toStage: 'QC_PENDING', action: 'qc_check', requiredFields: [] },
  
  // From QC_PENDING
  { fromStage: 'QC_PENDING', toStage: 'QC_PASSED', action: 'qc_check', requiredFields: ['qc_results'] },
  { fromStage: 'QC_PENDING', toStage: 'QC_FAILED', action: 'qc_check', requiredFields: ['qc_results'] },
  
  // From QC_PASSED
  { fromStage: 'QC_PASSED', toStage: 'COMPLETED', action: 'complete', requiredFields: [] },
  
  // From QC_FAILED
  { fromStage: 'QC_FAILED', toStage: 'ORDERED', action: 'return', requiredFields: ['remarks'] },
  { fromStage: 'QC_FAILED', toStage: 'CANCELLED', action: 'reject', requiredFields: ['remarks'] }
];

async function setupWorkflowSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');
    
    // Step 1: Create permissions
    console.log('\n📋 Creating permissions...');
    const createdPermissions = new Map();
    
    for (const perm of workflowPermissions) {
      const created = await Permission.findOneAndUpdate(
        { name: perm.name },
        perm,
        { upsert: true, new: true }
      );
      createdPermissions.set(perm.name, created._id);
      console.log(`  ✅ ${perm.name}`);
    }
    
    console.log(`✅ Created ${workflowPermissions.length} permissions`);
    
    // Step 2: Create workflow stages
    console.log('\n🔄 Creating workflow stages...');
    const stageMap = new Map();
    
    for (const stage of workflowStages) {
      // Convert permission names to IDs
      const requiredPermissionIds = stage.requiredPermissions
        .map(permName => createdPermissions.get(permName))
        .filter(Boolean);
      
      const created = await WorkflowStage.findOneAndUpdate(
        { code: stage.code },
        {
          ...stage,
          requiredPermissions: requiredPermissionIds,
          nextStages: [], // Will be updated in next step
          isActive: true
        },
        { upsert: true, new: true }
      );
      
      stageMap.set(stage.code, created._id);
      console.log(`  ✅ ${stage.name} (${stage.code})`);
    }
    
    console.log(`✅ Created ${workflowStages.length} workflow stages`);
    
    // Step 3: Create workflow transitions and update nextStages
    console.log('\n🔗 Creating workflow transitions...');
    const nextStagesMap = new Map();
    
    for (const transition of workflowTransitions) {
      const fromStageId = stageMap.get(transition.fromStage);
      const toStageId = stageMap.get(transition.toStage);
      
      if (fromStageId && toStageId) {
        await WorkflowTransition.findOneAndUpdate(
          {
            fromStage: fromStageId,
            toStage: toStageId,
            action: transition.action
          },
          {
            ...transition,
            fromStage: fromStageId,
            toStage: toStageId
          },
          { upsert: true, new: true }
        );
        
        // Track next stages for each stage
        if (!nextStagesMap.has(transition.fromStage)) {
          nextStagesMap.set(transition.fromStage, []);
        }
        nextStagesMap.get(transition.fromStage).push(toStageId);
        
        console.log(`  ✅ ${transition.fromStage} → ${transition.toStage} (${transition.action})`);
      }
    }
    
    // Update nextStages for each workflow stage
    for (const [stageCode, nextStageIds] of nextStagesMap) {
      const stageId = stageMap.get(stageCode);
      if (stageId) {
        await WorkflowStage.findByIdAndUpdate(stageId, {
          nextStages: [...new Set(nextStageIds)] // Remove duplicates
        });
      }
    }
    
    console.log(`✅ Created ${workflowTransitions.length} workflow transitions`);
    
    // Step 4: Assign all permissions to admin user
    console.log('\n👑 Assigning permissions to admin user...');
    const adminUser = await User.findOne({ email: 'admin@matrixmedys.com' });
    
    if (adminUser) {
      // Remove existing permissions first
      await UserPermission.deleteMany({ userId: adminUser._id });
      
      // Add all permissions
      const allPermissionIds = Array.from(createdPermissions.values());
      const userPermissions = allPermissionIds.map(permissionId => ({
        userId: adminUser._id,
        permissionId
      }));
      
      await UserPermission.insertMany(userPermissions);
      console.log(`  ✅ Assigned ${allPermissionIds.length} permissions to admin`);
    } else {
      console.log('  ⚠️  Admin user not found. Please create admin user first.');
    }
    
    // Step 5: Create sample user assignments (optional)
    console.log('\n👥 Setting up sample user roles...');
    
    // Create sample users if they don't exist
    const sampleUsers = [
      {
        name: 'Purchase Manager',
        email: 'purchase@matrixmedys.com',
        password: 'password123',
        permissions: ['po_view', 'po_create', 'po_edit']
      },
      {
        name: 'Approver Level 1',
        email: 'approver1@matrixmedys.com',
        password: 'password123',
        permissions: ['po_view', 'po_approve_level1', 'po_reject', 'po_return']
      },
      {
        name: 'Approver Level 2',
        email: 'approver2@matrixmedys.com',
        password: 'password123',
        permissions: ['po_view', 'po_approve_level2', 'po_approve_final', 'po_reject']
      },
      {
        name: 'Warehouse Manager',
        email: 'warehouse@matrixmedys.com',
        password: 'password123',
        permissions: ['po_view', 'po_receive', 'invoice_receiving_create']
      },
      {
        name: 'QC Manager',
        email: 'qc@matrixmedys.com',
        password: 'password123',
        permissions: ['po_view', 'po_qc_check', 'po_qc_approve', 'po_qc_reject']
      }
    ];
    
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: userData.password // Will be hashed by pre-save hook
        });
        
        await user.save();
        
        // Assign permissions
        const permissionIds = userData.permissions
          .map(permName => createdPermissions.get(permName))
          .filter(Boolean);
        
        const userPermissions = permissionIds.map(permissionId => ({
          userId: user._id,
          permissionId
        }));
        
        await UserPermission.insertMany(userPermissions);
        console.log(`  ✅ Created user: ${userData.name} with ${permissionIds.length} permissions`);
      } else {
        console.log(`  ⚠️  User already exists: ${userData.name}`);
      }
    }
    
    // Step 6: Summary
    console.log('\n📊 Setup Summary:');
    console.log(`  ✅ ${workflowPermissions.length} permissions created`);
    console.log(`  ✅ ${workflowStages.length} workflow stages created`);
    console.log(`  ✅ ${workflowTransitions.length} workflow transitions created`);
    console.log(`  ✅ ${sampleUsers.length} sample users created`);
    console.log(`  ✅ Admin user permissions updated`);
    
    console.log('\n🎉 Workflow system setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Login to the application');
    console.log('  2. Go to Workflow > Stages');
    console.log('  3. Assign users to appropriate stages');
    console.log('  4. Create a test purchase order');
    console.log('  5. Test the workflow transitions');
    
    console.log('\n👥 Sample Users Created:');
    sampleUsers.forEach(user => {
      console.log(`  📧 ${user.email} (${user.name})`);
      console.log(`     Password: password123`);
      console.log(`     Role: ${user.permissions.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up workflow system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Export for use as module
export { setupWorkflowSystem };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWorkflowSystem();
}