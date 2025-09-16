// server/controllers/workflowController.js
import WorkflowStage from '../models/WorkflowStage.js';
import WorkflowTransition from '../models/WorkflowTransition.js';
import StagePermission from '../models/StagePermission.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import InvoiceReceiving from '../models/InvoiceReceiving.js';
import User from '../models/User.js';
import Permission from '../models/Permission.js';

// ========== WORKFLOW STAGES ==========

export const getWorkflowStages = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    
    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const stages = await WorkflowStage.find(query)
      .populate('requiredPermissions', 'name resource action')
      .populate('nextStages', 'name code')
      .sort({ sequence: 1 });
    
    res.json({ stages });
  } catch (error) {
    console.error('Get workflow stages error:', error);
    res.status(500).json({ message: 'Failed to fetch workflow stages' });
  }
};

export const getWorkflowStage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const stage = await WorkflowStage.findById(id)
      .populate('requiredPermissions')
      .populate('nextStages')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!stage) {
      return res.status(404).json({ message: 'Workflow stage not found' });
    }
    
    // Get transition information
    const transitions = await WorkflowTransition.find({
      $or: [{ fromStage: id }, { toStage: id }]
    }).populate('fromStage toStage', 'name code');
    
    res.json({ stage, transitions });
  } catch (error) {
    console.error('Get workflow stage error:', error);
    res.status(500).json({ message: 'Failed to fetch workflow stage' });
  }
};

export const createWorkflowStage = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      sequence,
      requiredPermissions,
      allowedActions,
      nextStages
    } = req.body;
    
    // Check if code already exists
    const existing = await WorkflowStage.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: 'Stage code already exists' });
    }
    
    const stage = new WorkflowStage({
      name,
      code,
      description,
      sequence,
      requiredPermissions,
      allowedActions,
      nextStages,
      createdBy: req.user._id
    });
    
    await stage.save();
    await stage.populate('requiredPermissions nextStages');
    
    res.status(201).json({
      message: 'Workflow stage created successfully',
      stage
    });
  } catch (error) {
    console.error('Create workflow stage error:', error);
    res.status(500).json({ message: 'Failed to create workflow stage' });
  }
};

export const updateWorkflowStage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const stage = await WorkflowStage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Workflow stage not found' });
    }
    
    // Check if new code conflicts with existing
    if (updates.code && updates.code !== stage.code) {
      const existing = await WorkflowStage.findOne({ 
        code: updates.code, 
        _id: { $ne: id } 
      });
      if (existing) {
        return res.status(400).json({ message: 'Stage code already exists' });
      }
    }
    
    Object.assign(stage, updates);
    stage.updatedBy = req.user._id;
    
    await stage.save();
    await stage.populate('requiredPermissions nextStages');
    
    res.json({
      message: 'Workflow stage updated successfully',
      stage
    });
  } catch (error) {
    console.error('Update workflow stage error:', error);
    res.status(500).json({ message: 'Failed to update workflow stage' });
  }
};

export const deleteWorkflowStage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if stage is in use
    const inUse = await PurchaseOrder.exists({ currentStage: id });
    if (inUse) {
      return res.status(400).json({ 
        message: 'Cannot delete stage that is currently in use' 
      });
    }
    
    // Remove stage from other stages' nextStages arrays
    await WorkflowStage.updateMany(
      { nextStages: id },
      { $pull: { nextStages: id } }
    );
    
    // Delete related transitions
    await WorkflowTransition.deleteMany({
      $or: [{ fromStage: id }, { toStage: id }]
    });
    
    await WorkflowStage.findByIdAndDelete(id);
    
    res.json({ message: 'Workflow stage deleted successfully' });
  } catch (error) {
    console.error('Delete workflow stage error:', error);
    res.status(500).json({ message: 'Failed to delete workflow stage' });
  }
};

export const reorderWorkflowStages = async (req, res) => {
  try {
    const { stages } = req.body;
    
    // Update sequences
    const bulkOps = stages.map(stage => ({
      updateOne: {
        filter: { _id: stage.id },
        update: { sequence: stage.sequence }
      }
    }));
    
    await WorkflowStage.bulkWrite(bulkOps);
    
    res.json({ message: 'Workflow stages reordered successfully' });
  } catch (error) {
    console.error('Reorder workflow stages error:', error);
    res.status(500).json({ message: 'Failed to reorder workflow stages' });
  }
};

export const cloneWorkflowStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    
    const original = await WorkflowStage.findById(id);
    if (!original) {
      return res.status(404).json({ message: 'Workflow stage not found' });
    }
    
    const cloned = new WorkflowStage({
      name,
      code,
      description: original.description,
      sequence: original.sequence + 1,
      requiredPermissions: original.requiredPermissions,
      allowedActions: original.allowedActions,
      nextStages: original.nextStages,
      isActive: false,
      createdBy: req.user._id
    });
    
    await cloned.save();
    
    res.status(201).json({
      message: 'Workflow stage cloned successfully',
      stage: cloned
    });
  } catch (error) {
    console.error('Clone workflow stage error:', error);
    res.status(500).json({ message: 'Failed to clone workflow stage' });
  }
};

// ========== WORKFLOW TRANSITIONS ==========

export const getWorkflowTransitions = async (req, res) => {
  try {
    const { fromStage, toStage, action } = req.query;
    
    let query = {};
    if (fromStage) query.fromStage = fromStage;
    if (toStage) query.toStage = toStage;
    if (action) query.action = action;
    
    const transitions = await WorkflowTransition.find(query)
      .populate('fromStage', 'name code')
      .populate('toStage', 'name code');
    
    res.json({ transitions });
  } catch (error) {
    console.error('Get workflow transitions error:', error);
    res.status(500).json({ message: 'Failed to fetch workflow transitions' });
  }
};

export const createWorkflowTransition = async (req, res) => {
  try {
    const transition = new WorkflowTransition({
      ...req.body,
      createdBy: req.user._id
    });
    
    await transition.save();
    await transition.populate('fromStage toStage');
    
    res.status(201).json({
      message: 'Workflow transition created successfully',
      transition
    });
  } catch (error) {
    console.error('Create workflow transition error:', error);
    res.status(500).json({ message: 'Failed to create workflow transition' });
  }
};

export const updateWorkflowTransition = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const transition = await WorkflowTransition.findById(id);
    if (!transition) {
      return res.status(404).json({ message: 'Workflow transition not found' });
    }
    
    Object.assign(transition, updates);
    transition.updatedBy = req.user._id;
    
    await transition.save();
    await transition.populate('fromStage toStage');
    
    res.json({
      message: 'Workflow transition updated successfully',
      transition
    });
  } catch (error) {
    console.error('Update workflow transition error:', error);
    res.status(500).json({ message: 'Failed to update workflow transition' });
  }
};

export const deleteWorkflowTransition = async (req, res) => {
  try {
    const { id } = req.params;
    
    await WorkflowTransition.findByIdAndDelete(id);
    
    res.json({ message: 'Workflow transition deleted successfully' });
  } catch (error) {
    console.error('Delete workflow transition error:', error);
    res.status(500).json({ message: 'Failed to delete workflow transition' });
  }
};

// ========== PERMISSION MANAGEMENT ==========

export const assignStagePermissions = async (req, res) => {
  try {
    const { userId, stageId, permissions = [], expiryDate, remarks } = req.body;
    
    console.log('Assigning stage permissions:', {
      userId,
      stageId,
      permissions,
      expiryDate,
      remarks,
      assignedBy: req.user._id
    });
    
    // Validate required fields
    if (!userId || !stageId) {
      return res.status(400).json({ 
        message: 'userId and stageId are required' 
      });
    }
    
    // Validate that user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    // Validate that stage exists
    const stage = await WorkflowStage.findById(stageId);
    if (!stage) {
      return res.status(404).json({ 
        message: 'Workflow stage not found' 
      });
    }
    
    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions }
      });
      
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          message: 'One or more invalid permission IDs provided' 
        });
      }
    }
    
    // Remove existing permissions for this user-stage combination
    await StagePermission.deleteMany({ userId, stageId });
    
    // Create new permission assignment only if there are permissions to assign
    // or if we want to create a record even with empty permissions
    const assignment = new StagePermission({
      userId,
      stageId,
      permissions: permissions || [], // Default to empty array if not provided
      expiryDate,
      remarks,
      assignedBy: req.user._id,
      isActive: true
    });
    
    await assignment.save();
    
    // Populate the assignment for response
    await assignment.populate([
      {
        path: 'userId',
        select: 'name email'
      },
      {
        path: 'stageId',
        select: 'name code'
      },
      {
        path: 'permissions',
        select: 'name resource action description'
      },
      {
        path: 'assignedBy',
        select: 'name email'
      }
    ]);
    
    console.log('Permission assignment created:', assignment);
    
    res.json({
      message: 'Permissions assigned successfully',
      assignment
    });
  } catch (error) {
    console.error('Assign stage permissions error:', error);
    res.status(500).json({ 
      message: 'Failed to assign permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const revokeStagePermissions = async (req, res) => {
  try {
    const { userId, stageId, permissions } = req.body;
    
    console.log('Revoking stage permissions:', {
      userId,
      stageId,
      permissions
    });
    
    // Validate required fields
    if (!userId || !stageId) {
      return res.status(400).json({ 
        message: 'userId and stageId are required' 
      });
    }
    
    if (permissions && permissions.length > 0) {
      // Revoke specific permissions
      const result = await StagePermission.updateOne(
        { userId, stageId, isActive: true },
        { $pull: { permissions: { $in: permissions } } }
      );
      
      console.log('Partial revoke result:', result);
      
      // Check if there are any permissions left
      const updatedAssignment = await StagePermission.findOne({ userId, stageId });
      if (updatedAssignment && updatedAssignment.permissions.length === 0) {
        // If no permissions left, mark as inactive or delete
        await StagePermission.deleteOne({ userId, stageId });
      }
    } else {
      // Revoke all permissions for this user-stage
      const result = await StagePermission.deleteMany({ userId, stageId });
      console.log('Full revoke result:', result);
    }
    
    res.json({ message: 'Permissions revoked successfully' });
  } catch (error) {
    console.error('Revoke stage permissions error:', error);
    res.status(500).json({ 
      message: 'Failed to revoke permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const bulkAssignPermissions = async (req, res) => {
  try {
    const { assignments, overwrite = false } = req.body;
    
    console.log('Bulk assigning permissions:', {
      assignmentsCount: assignments?.length,
      overwrite,
      assignedBy: req.user._id
    });
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ 
        message: 'Assignments array is required and cannot be empty' 
      });
    }
    
    // Validate all assignments
    for (const assignment of assignments) {
      if (!assignment.userId || !assignment.stageId) {
        return res.status(400).json({ 
          message: 'Each assignment must have userId and stageId' 
        });
      }
    }
    
    if (overwrite) {
      // Remove existing assignments for affected user-stage combinations
      const conditions = assignments.map(a => ({
        userId: a.userId,
        stageId: a.stageId
      }));
      
      await StagePermission.deleteMany({ $or: conditions });
    }
    
    // Create new assignments
    const newAssignments = assignments.map(a => ({
      userId: a.userId,
      stageId: a.stageId,
      permissions: a.permissions || [],
      expiryDate: a.expiryDate,
      remarks: a.remarks,
      assignedBy: req.user._id,
      isActive: true
    }));
    
    const results = await StagePermission.insertMany(newAssignments, { 
      ordered: false // Continue on error
    });
    
    console.log('Bulk assignment results:', results.length);
    
    res.json({
      message: `${results.length} permission assignments created successfully`,
      assignments: results
    });
  } catch (error) {
    console.error('Bulk assign permissions error:', error);
    
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      res.status(400).json({ 
        message: 'Some user-stage combinations already exist. Use overwrite option to replace them.' 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to bulk assign permissions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};


export const getUserStagePermissions = async (req, res) => {
  try {
    const { userId, stageId } = req.params;
    
    console.log('Getting user stage permissions:', { userId, stageId });
    
    const permissions = await StagePermission.findOne({ 
      userId, 
      stageId,
      isActive: true 
    })
      .populate('permissions', 'name resource action description')
      .populate('stageId', 'name code')
      .populate('assignedBy', 'name email');
    
    res.json({ permissions });
  } catch (error) {
    console.error('Get user stage permissions error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getStageUsers = async (req, res) => {
  try {
    const { stageId } = req.params;
    const { includePermissions = false } = req.query;
    
    console.log('Getting stage users:', { stageId, includePermissions });
    
    let query = StagePermission.find({ 
      stageId,
      isActive: true 
    })
      .populate('userId', 'name email')
      .populate('assignedBy', 'name email');
    
    if (includePermissions === 'true' || includePermissions === true) {
      query = query.populate('permissions', 'name resource action description');
    }
    
    const assignments = await query.sort({ createdAt: -1 });
    
    console.log('Found stage users:', assignments.length);
    
    res.json({ users: assignments });
  } catch (error) {
    console.error('Get stage users error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch stage users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========== WORKFLOW OPERATIONS ==========

export const validateWorkflowAction = async (req, res) => {
  try {
    const { entityId, entityType, action, remarks } = req.body;
    
    let entity;
    if (entityType === 'purchase_order') {
      entity = await PurchaseOrder.findById(entityId)
        .populate('currentStage');
    } else if (entityType === 'invoice_receiving') {
      entity = await InvoiceReceiving.findById(entityId);
    }
    
    if (!entity) {
      return res.status(404).json({ message: 'Entity not found' });
    }
    
    // Check if action is allowed in current stage
    const currentStage = await WorkflowStage.findById(entity.currentStage);
    if (!currentStage.allowedActions.includes(action)) {
      return res.status(400).json({
        isValid: false,
        message: `Action '${action}' is not allowed in stage '${currentStage.name}'`
      });
    }
    
    // Check user permissions
    const userPermissions = await StagePermission.findOne({
      userId: req.user._id,
      stageId: currentStage._id
    });
    
    if (!userPermissions) {
      return res.status(403).json({
        isValid: false,
        message: 'You do not have permissions for this stage'
      });
    }
    
    // Check for required fields based on transition
    const transition = await WorkflowTransition.findOne({
      fromStage: currentStage._id,
      action
    });
    
    if (transition && transition.requiredFields) {
      const missingFields = transition.requiredFields.filter(field => !req.body.data?.[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          isValid: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    }
    
    res.json({
      isValid: true,
      nextStage: transition?.toStage,
      message: 'Action is valid'
    });
  } catch (error) {
    console.error('Validate workflow action error:', error);
    res.status(500).json({ message: 'Failed to validate workflow action' });
  }
};

export const getWorkflowVisualization = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const stages = await WorkflowStage.find({ isActive: true })
      .sort({ sequence: 1 });
    const transitions = await WorkflowTransition.find();
    
    if (format === 'mermaid') {
      // Generate Mermaid diagram syntax
      let mermaid = 'graph TD\n';
      
      stages.forEach(stage => {
        mermaid += `  ${stage.code}[${stage.name}]\n`;
      });
      
      transitions.forEach(transition => {
        const fromStage = stages.find(s => s._id.toString() === transition.fromStage.toString());
        const toStage = stages.find(s => s._id.toString() === transition.toStage.toString());
        if (fromStage && toStage) {
          mermaid += `  ${fromStage.code} -->|${transition.action}| ${toStage.code}\n`;
        }
      });
      
      res.json({ diagram: mermaid });
    } else {
      // Return JSON structure
      res.json({
        nodes: stages.map(stage => ({
          id: stage._id,
          label: stage.name,
          code: stage.code,
          sequence: stage.sequence
        })),
        edges: transitions.map(transition => ({
          from: transition.fromStage,
          to: transition.toStage,
          label: transition.action
        }))
      });
    }
  } catch (error) {
    console.error('Get workflow visualization error:', error);
    res.status(500).json({ message: 'Failed to generate workflow visualization' });
  }
};

export const getWorkflowHistory = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    let history = [];
    
    if (entityType === 'purchase_order') {
      const po = await PurchaseOrder.findById(entityId)
        .select('workflowHistory')
        .populate('workflowHistory.stage', 'name code')
        .populate('workflowHistory.actionBy', 'name email');
      
      history = po?.workflowHistory || [];
    }
    
    // Paginate history
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = history.slice(startIndex, endIndex);
    
    res.json({
      history: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.length,
        pages: Math.ceil(history.length / limit)
      }
    });
  } catch (error) {
    console.error('Get workflow history error:', error);
    res.status(500).json({ message: 'Failed to fetch workflow history' });
  }
};

// ========== REPORTING & ANALYTICS ==========

export const getWorkflowStatistics = async (req, res) => {
  try {
    const { fromDate, toDate, stageId, entityType } = req.query;
    
    let matchQuery = {};
    if (fromDate || toDate) {
      matchQuery.createdAt = {};
      if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate);
      if (toDate) matchQuery.createdAt.$lte = new Date(toDate);
    }
    if (stageId) matchQuery.currentStage = stageId;
    
    // Get statistics based on entity type
    let Model = entityType === 'invoice_receiving' ? InvoiceReceiving : PurchaseOrder;
    
    const statistics = await Model.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
          avgTimeInStage: {
            $avg: {
              $subtract: [new Date(), '$updatedAt']
            }
          }
        }
      },
      {
        $lookup: {
          from: 'workflowstages',
          localField: '_id',
          foreignField: '_id',
          as: 'stageInfo'
        }
      },
      { $unwind: '$stageInfo' },
      {
        $project: {
          stageName: '$stageInfo.name',
          stageCode: '$stageInfo.code',
          count: 1,
          avgTimeHours: { $divide: ['$avgTimeInStage', 3600000] }
        }
      },
      { $sort: { 'stageInfo.sequence': 1 } }
    ]);
    
    res.json({ statistics });
  } catch (error) {
    console.error('Get workflow statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch workflow statistics' });
  }
};

export const exportWorkflowReport = async (req, res) => {
  try {
    const { format, fromDate, toDate, includeHistory } = req.query;
    
    // This would generate actual reports in production
    // For now, return a placeholder response
    res.json({
      message: `Report generation in ${format} format initiated`,
      format,
      parameters: { fromDate, toDate, includeHistory }
    });
  } catch (error) {
    console.error('Export workflow report error:', error);
    res.status(500).json({ message: 'Failed to export workflow report' });
  }
};

export default {
  getWorkflowStages,
  getWorkflowStage,
  createWorkflowStage,
  updateWorkflowStage,
  deleteWorkflowStage,
  reorderWorkflowStages,
  cloneWorkflowStage,
  getWorkflowTransitions,
  createWorkflowTransition,
  updateWorkflowTransition,
  deleteWorkflowTransition,
  assignStagePermissions,
  revokeStagePermissions,
  bulkAssignPermissions,
  getUserStagePermissions,
  getStageUsers,
  validateWorkflowAction,
  getWorkflowVisualization,
  getWorkflowHistory,
  getWorkflowStatistics,
  exportWorkflowReport
};