// server/seeders/workflowPermissionsSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/Permission.js';
import WorkflowStage from '../models/WorkflowStage.js';

dotenv.config();

const workflowPermissions = [
  // Purchase Order Permissions
  { name: 'po_view', description: 'View purchase orders', resource: 'purchase_orders', action: 'view' },
  { name: 'po_create', description: 'Create purchase orders', resource: 'purchase_orders', action: 'create' },
  { name: 'po_edit', description: 'Edit purchase orders', resource: 'purchase_orders', action: 'update' },
  { name: 'po_delete', description: 'Delete purchase orders', resource: 'purchase_orders', action: 'delete' },
  
  // Workflow Stage Permissions
  { name: 'po_approve_level1', description: 'Approve PO - Level 1', resource: 'po_workflow', action: 'approve_level1' },
  { name: 'po_approve_level2', description: 'Approve PO - Level 2', resource: 'po_workflow', action: 'approve_level2' },
  { name: 'po_approve_final', description: 'Final PO Approval', resource: 'po_workflow', action: 'approve_final' },
  { name: 'po_reject', description: 'Reject purchase orders', resource: 'po_workflow', action: 'reject' },
  { name: 'po_return', description: 'Return PO for revision', resource: 'po_workflow', action: 'return' },
  { name: 'po_cancel', description: 'Cancel purchase orders', resource: 'po_workflow', action: 'cancel' },
  
  // Receiving Permissions
  { name: 'po_receive', description: 'Receive products against PO', resource: 'po_receiving', action: 'receive' },
  { name: 'po_qc_check', description: 'Perform QC check on received products', resource: 'po_receiving', action: 'qc_check' },
  { name: 'po_qc_approve', description: 'Approve QC results', resource: 'po_receiving', action: 'qc_approve' },
  
  // Invoice Permissions
  { name: 'invoice_view', description: 'View invoices', resource: 'invoices', action: 'view' },
  { name: 'invoice_create', description: 'Create invoices', resource: 'invoices', action: 'create' },
  { name: 'invoice_update', description: 'Update invoices', resource: 'invoices', action: 'update' },
  { name: 'invoice_delete', description: 'Delete invoices', resource: 'invoices', action: 'delete' },
  
  // Workflow Management
  { name: 'workflow_view', description: 'View workflow stages', resource: 'workflow', action: 'view' },
  { name: 'workflow_manage', description: 'Manage workflow stages', resource: 'workflow', action: 'manage' },
  { name: 'workflow_assign', description: 'Assign workflow permissions', resource: 'workflow', action: 'assign' },
  // Missing user-to-stage assignment permissions
{ name: 'stage_assignments_create', description: 'Assign users to workflow stages', resource: 'stage_assignments', action: 'create' },
{ name: 'stage_assignments_update', description: 'Update stage assignments', resource: 'stage_assignments', action: 'update' },
{ name: 'stage_assignments_delete', description: 'Remove stage assignments', resource: 'stage_assignments', action: 'delete' },
{ name: 'stage_assignments_view', description: 'View stage assignments', resource: 'stage_assignments', action: 'view' },
{ name: 'stage_assignments_bulk', description: 'Bulk assign users to stages', resource: 'stage_assignments', action: 'bulk_assign' },

// Missing PO workflow actions
{ name: 'po_submit', description: 'Submit PO for approval', resource: 'po_workflow', action: 'submit' },
{ name: 'po_send', description: 'Send PO to supplier', resource: 'po_workflow', action: 'send' },
{ name: 'po_complete', description: 'Mark PO as completed', resource: 'po_workflow', action: 'complete' },
{ name: 'po_assign', description: 'Assign PO to user', resource: 'po_workflow', action: 'assign' },
{ name: 'po_reassign', description: 'Reassign PO to different user', resource: 'po_workflow', action: 'reassign' },
// Missing workflow stage CRUD permissions
{ name: 'workflow_stages_create', description: 'Create workflow stages', resource: 'workflow_stages', action: 'create' },
{ name: 'workflow_stages_update', description: 'Update workflow stages', resource: 'workflow_stages', action: 'update' },
{ name: 'workflow_stages_delete', description: 'Delete workflow stages', resource: 'workflow_stages', action: 'delete' },
{ name: 'workflow_stages_view', description: 'View workflow stages', resource: 'workflow_stages', action: 'view' },
// Missing invoice receiving permissions
{ name: 'invoice_receiving_view', description: 'View invoice receiving records', resource: 'invoice_receiving', action: 'view' },
{ name: 'invoice_receiving_create', description: 'Create invoice receiving records', resource: 'invoice_receiving', action: 'create' },
{ name: 'invoice_receiving_update', description: 'Update invoice receiving records', resource: 'invoice_receiving', action: 'update' },
{ name: 'invoice_receiving_delete', description: 'Delete invoice receiving records', resource: 'invoice_receiving', action: 'delete' },
{ name: 'invoice_receiving_qc_submit', description: 'Submit for QC', resource: 'invoice_receiving', action: 'qc_submit' },
{ name: 'invoice_receiving_qc_check', description: 'Perform QC check', resource: 'invoice_receiving', action: 'qc_check' },
{ name: 'invoice_receiving_qc_approve', description: 'Approve QC results', resource: 'invoice_receiving', action: 'qc_approve' },
{ name: 'invoice_receiving_qc_reject', description: 'Reject QC results', resource: 'invoice_receiving', action: 'qc_reject' },
// Missing workflow reporting permissions
{ name: 'workflow_history_view', description: 'View workflow history', resource: 'workflow_history', action: 'view' },
{ name: 'workflow_history_export', description: 'Export workflow reports', resource: 'workflow_history', action: 'export' },
{ name: 'workflow_analytics_view', description: 'View workflow analytics', resource: 'workflow_analytics', action: 'view' },
// Missing transition management permissions
{ name: 'workflow_transitions_create', description: 'Create workflow transitions', resource: 'workflow_transitions', action: 'create' },
{ name: 'workflow_transitions_update', description: 'Update workflow transitions', resource: 'workflow_transitions', action: 'update' },
{ name: 'workflow_transitions_delete', description: 'Delete workflow transitions', resource: 'workflow_transitions', action: 'delete' },
{ name: 'workflow_transitions_view', description: 'View workflow transitions', resource: 'workflow_transitions', action: 'view' },
];

const workflowStages = [
  {
    name: 'Draft',
    code: 'DRAFT',
    description: 'Initial PO creation',
    sequence: 1,
    allowedActions: ['edit', 'cancel'],
    nextStages: ['PENDING_APPROVAL']
  },
  {
    name: 'Pending Approval',
    code: 'PENDING_APPROVAL',
    description: 'Awaiting first level approval',
    sequence: 2,
    allowedActions: ['approve', 'reject', 'return'],
    nextStages: ['APPROVED_L1', 'DRAFT', 'CANCELLED']
  },
  {
    name: 'Approved Level 1',
    code: 'APPROVED_L1',
    description: 'First level approval completed',
    sequence: 3,
    allowedActions: ['approve', 'reject', 'return'],
    nextStages: ['APPROVED_FINAL', 'PENDING_APPROVAL', 'CANCELLED']
  },
  {
    name: 'Final Approval',
    code: 'APPROVED_FINAL',
    description: 'Final approval completed, ready to order',
    sequence: 4,
    allowedActions: ['edit'],
    nextStages: ['ORDERED']
  },
  {
    name: 'Ordered',
    code: 'ORDERED',
    description: 'PO sent to supplier',
    sequence: 5,
    allowedActions: ['receive'],
    nextStages: ['PARTIAL_RECEIVED', 'RECEIVED']
  },
  {
    name: 'Partial Received',
    code: 'PARTIAL_RECEIVED',
    description: 'Some products received',
    sequence: 6,
    allowedActions: ['receive'],
    nextStages: ['RECEIVED']
  },
  {
    name: 'Received',
    code: 'RECEIVED',
    description: 'All products received',
    sequence: 7,
    allowedActions: ['qc_check'],
    nextStages: ['QC_PENDING']
  },
  {
    name: 'QC Pending',
    code: 'QC_PENDING',
    description: 'Quality check in progress',
    sequence: 8,
    allowedActions: ['qc_check'],
    nextStages: ['QC_PASSED', 'QC_FAILED']
  },
  {
    name: 'QC Passed',
    code: 'QC_PASSED',
    description: 'Quality check passed',
    sequence: 9,
    allowedActions: [],
    nextStages: ['COMPLETED']
  },
  {
    name: 'QC Failed',
    code: 'QC_FAILED',
    description: 'Quality check failed',
    sequence: 10,
    allowedActions: ['return'],
    nextStages: ['ORDERED']
  },
  {
    name: 'Completed',
    code: 'COMPLETED',
    description: 'PO process completed',
    sequence: 11,
    allowedActions: [],
    nextStages: []
  },
  {
    name: 'Cancelled',
    code: 'CANCELLED',
    description: 'PO cancelled',
    sequence: 12,
    allowedActions: [],
    nextStages: []
  }
];

async function seedWorkflowData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Seed permissions
    for (const perm of workflowPermissions) {
      await Permission.findOneAndUpdate(
        { name: perm.name },
        perm,
        { upsert: true, new: true }
      );
    }
    console.log('✅ Workflow permissions seeded');
    
    // Seed workflow stages
    const stageMap = {};
    
    // First pass: Create stages
    for (const stage of workflowStages) {
      const created = await WorkflowStage.findOneAndUpdate(
        { code: stage.code },
        {
          name: stage.name,
          code: stage.code,
          description: stage.description,
          sequence: stage.sequence,
          allowedActions: stage.allowedActions,
          isActive: true
        },
        { upsert: true, new: true }
      );
      stageMap[stage.code] = created._id;
    }
    
    // Second pass: Update nextStages references
    for (const stage of workflowStages) {
      const nextStageIds = stage.nextStages.map(code => stageMap[code]).filter(Boolean);
      await WorkflowStage.findOneAndUpdate(
        { code: stage.code },
        { nextStages: nextStageIds }
      );
    }
    
    console.log('✅ Workflow stages seeded');
    console.log('✅ Workflow setup completed successfully');
    
  } catch (error) {
    console.error('Error seeding workflow data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedWorkflowData();