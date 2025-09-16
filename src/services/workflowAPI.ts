// src/services/workflowAPI.ts - COMPLETE UPDATED VERSION
import api from './api';

// Interfaces
export interface WorkflowStage {
  _id: string;
  name: string;
  code: string;
  description: string;
  sequence: number;
  requiredPermissions: Array<{
    _id: string;
    name: string;
    resource: string;
    action: string;
  }>;
  allowedActions: ('edit' | 'approve' | 'reject' | 'return' | 'cancel' | 'receive' | 'qc_check')[];
  nextStages: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTransition {
  _id: string;
  fromStage: {
    _id: string;
    name: string;
    code: string;
  } | string;
  toStage: {
    _id: string;
    name: string;
    code: string;
  } | string;
  action: 'approve' | 'reject' | 'return' | 'cancel' | 'receive' | 'qc_check' | 'complete';
  conditions?: any;
  autoTransition?: boolean;
  requiredFields?: string[];
  notificationTemplate?: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StagePermission {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  stageId: {
    _id: string;
    name: string;
    code: string;
  } | string;
  permissions: Array<{
    _id: string;
    name: string;
    resource: string;
    action: string;
  }>;
  expiryDate?: string;
  assignedBy: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStageFormData {
  name: string;
  code: string;
  description?: string;
  sequence: number;
  requiredPermissions?: string[];
  allowedActions: string[];
  nextStages?: string[];
  isActive?: boolean;
}

export interface WorkflowTransitionFormData {
  fromStage: string;
  toStage: string;
  action: string;
  conditions?: any;
  autoTransition?: boolean;
  requiredFields?: string[];
  notificationTemplate?: string;
}

export interface StagePermissionAssignment {
  userId: string;
  stageId: string;
  permissions: string[];
  expiryDate?: string;
  remarks?: string;
}

export interface BulkPermissionAssignment {
  assignments: StagePermissionAssignment[];
  overwrite?: boolean;
}

export interface WorkflowValidation {
  entityId: string;
  entityType: 'purchase_order' | 'invoice_receiving';
  action: string;
  remarks?: string;
  data?: any;
}

export interface WorkflowVisualization {
  nodes: Array<{
    id: string;
    label: string;
    code: string;
    sequence: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label: string;
  }>;
  diagram?: string; // For Mermaid format
}

export interface WorkflowHistoryEntry {
  _id: string;
  stage: {
    _id: string;
    name: string;
    code: string;
  };
  action: string;
  actionBy: {
    _id: string;
    name: string;
    email: string;
  };
  actionDate: string;
  remarks?: string;
  changes?: any;
}

export interface WorkflowStatistics {
  stageName: string;
  stageCode: string;
  count: number;
  avgTimeHours?: number;
}

// Workflow API Service
export const workflowAPI = {
  // ===== WORKFLOW STAGES =====
  
  // Get all workflow stages
  getWorkflowStages: async (params?: { isActive?: boolean; search?: string }): Promise<{ stages: WorkflowStage[] }> => {
    try {
      console.log('Fetching workflow stages:', params);
      const response = await api.get('/workflow/stages', { params });
      console.log('Workflow stages response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow stages:', error);
      throw error;
    }
  },

  // Get single workflow stage
  getWorkflowStage: async (id: string): Promise<{ stage: WorkflowStage; transitions: WorkflowTransition[] }> => {
    try {
      console.log('Fetching workflow stage:', id);
      const response = await api.get(`/workflow/stages/${id}`);
      console.log('Workflow stage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow stage:', error);
      throw error;
    }
  },

  // Create workflow stage
  createWorkflowStage: async (data: WorkflowStageFormData): Promise<{ message: string; stage: WorkflowStage }> => {
    try {
      console.log('Creating workflow stage:', data);
      const response = await api.post('/workflow/stages', data);
      console.log('Create workflow stage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating workflow stage:', error);
      throw error;
    }
  },

  // Update workflow stage
  updateWorkflowStage: async (id: string, data: Partial<WorkflowStageFormData>): Promise<{ message: string; stage: WorkflowStage }> => {
    try {
      console.log('Updating workflow stage:', id, data);
      const response = await api.put(`/workflow/stages/${id}`, data);
      console.log('Update workflow stage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating workflow stage:', error);
      throw error;
    }
  },

  // Delete workflow stage
  deleteWorkflowStage: async (id: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting workflow stage:', id);
      const response = await api.delete(`/workflow/stages/${id}`);
      console.log('Delete workflow stage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting workflow stage:', error);
      throw error;
    }
  },

  // Reorder workflow stages
  reorderWorkflowStages: async (stages: Array<{ id: string; sequence: number }>): Promise<{ message: string }> => {
    try {
      console.log('Reordering workflow stages:', stages);
      const response = await api.post('/workflow/stages/reorder', { stages });
      console.log('Reorder workflow stages response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error reordering workflow stages:', error);
      throw error;
    }
  },

  // Clone workflow stage
  cloneWorkflowStage: async (id: string, data: { name: string; code: string }): Promise<{ message: string; stage: WorkflowStage }> => {
    try {
      console.log('Cloning workflow stage:', id, data);
      const response = await api.post(`/workflow/stages/${id}/clone`, data);
      console.log('Clone workflow stage response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error cloning workflow stage:', error);
      throw error;
    }
  },

  // ===== WORKFLOW TRANSITIONS =====
  
  // Get workflow transitions
  getWorkflowTransitions: async (params?: { fromStage?: string; toStage?: string; action?: string }): Promise<{ transitions: WorkflowTransition[] }> => {
    try {
      console.log('Fetching workflow transitions:', params);
      const response = await api.get('/workflow/transitions', { params });
      console.log('Workflow transitions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow transitions:', error);
      throw error;
    }
  },

  // Create workflow transition
  createWorkflowTransition: async (data: WorkflowTransitionFormData): Promise<{ message: string; transition: WorkflowTransition }> => {
    try {
      console.log('Creating workflow transition:', data);
      const response = await api.post('/workflow/transitions', data);
      console.log('Create workflow transition response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating workflow transition:', error);
      throw error;
    }
  },

  // Update workflow transition
  updateWorkflowTransition: async (id: string, data: Partial<WorkflowTransitionFormData>): Promise<{ message: string; transition: WorkflowTransition }> => {
    try {
      console.log('Updating workflow transition:', id, data);
      const response = await api.put(`/workflow/transitions/${id}`, data);
      console.log('Update workflow transition response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating workflow transition:', error);
      throw error;
    }
  },

  // Delete workflow transition
  deleteWorkflowTransition: async (id: string): Promise<{ message: string }> => {
    try {
      console.log('Deleting workflow transition:', id);
      const response = await api.delete(`/workflow/transitions/${id}`);
      console.log('Delete workflow transition response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting workflow transition:', error);
      throw error;
    }
  },

  // ===== PERMISSION MANAGEMENT =====
  
  // Assign permissions to user for stage
  assignStagePermissions: async (data: StagePermissionAssignment): Promise<{ message: string; assignment: StagePermission }> => {
    try {
      console.log('Assigning stage permissions:', data);
      const response = await api.post('/workflow/permissions/assign', data);
      console.log('Assign permissions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error assigning permissions:', error);
      throw error;
    }
  },

  // Revoke permissions from user for stage
  revokeStagePermissions: async (data: { userId: string; stageId: string; permissions?: string[] }): Promise<{ message: string }> => {
    try {
      console.log('Revoking stage permissions:', data);
      const response = await api.post('/workflow/permissions/revoke', data);
      console.log('Revoke permissions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error revoking permissions:', error);
      throw error;
    }
  },

  // Bulk assign permissions
  bulkAssignPermissions: async (data: BulkPermissionAssignment): Promise<{ message: string; assignments: StagePermission[] }> => {
    try {
      console.log('Bulk assigning permissions:', data);
      const response = await api.post('/workflow/permissions/bulk-assign', data);
      console.log('Bulk assign response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error bulk assigning permissions:', error);
      throw error;
    }
  },

  // Get user permissions for stage
  getUserStagePermissions: async (userId: string, stageId: string): Promise<{ permissions: StagePermission | null }> => {
    try {
      console.log('Fetching user stage permissions:', userId, stageId);
      const response = await api.get(`/workflow/permissions/user/${userId}/stage/${stageId}`);
      console.log('User stage permissions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stage permissions:', error);
      throw error;
    }
  },

  // Get all users with permissions for a stage
  getStageUsers: async (stageId: string, includePermissions?: boolean): Promise<{ users: StagePermission[] }> => {
    try {
      const params = includePermissions ? { includePermissions: true } : {};
      console.log('Fetching stage users:', stageId, params);
      const response = await api.get(`/workflow/permissions/stage/${stageId}/users`, { params });
      console.log('Stage users response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stage users:', error);
      throw error;
    }
  },

  // ===== MISSING METHODS FOR USER ASSIGNMENT =====

  // Get stage assignments (alias for getStageUsers)
  getStageAssignments: async (stageId: string): Promise<{ users: StagePermission[] }> => {
    return workflowAPI.getStageUsers(stageId, true);
  },

  // Update stage assignments (bulk update method)
  updateStageAssignments: async (stageId: string, data: { userIds: string[] }): Promise<{ message: string }> => {
    try {
      console.log('Updating stage assignments for stage:', stageId, data);
      
      // First, get current assignments
      const currentResponse = await workflowAPI.getStageUsers(stageId, true);
      const currentUserIds = currentResponse.users
        .filter(user => user.isActive)
        .map(user => typeof user.userId === 'string' ? user.userId : user.userId._id);
      
      // Find users to assign and revoke
      const usersToAssign = data.userIds.filter(userId => !currentUserIds.includes(userId));
      const usersToRevoke = currentUserIds.filter(userId => !data.userIds.includes(userId));
      
      // Create assignment operations
      const assignments = usersToAssign.map(userId => ({
        userId,
        stageId,
        permissions: [], // Default empty permissions, can be configured later
      }));
      
      // Execute bulk assignment if there are new users
      if (assignments.length > 0) {
        await workflowAPI.bulkAssignPermissions({
          assignments,
          overwrite: false
        });
      }
      
      // Revoke permissions for removed users
      for (const userId of usersToRevoke) {
        await workflowAPI.revokeStagePermissions({
          userId,
          stageId
        });
      }
      
      return { message: 'Stage assignments updated successfully' };
    } catch (error) {
      console.error('Error updating stage assignments:', error);
      throw error;
    }
  },

  // ===== WORKFLOW OPERATIONS =====
  
  // Validate workflow action
  validateWorkflowAction: async (data: WorkflowValidation): Promise<{ isValid: boolean; nextStage?: string; message: string }> => {
    try {
      console.log('Validating workflow action:', data);
      const response = await api.post('/workflow/validate', data);
      console.log('Workflow validation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error validating workflow action:', error);
      throw error;
    }
  },

  // Execute workflow transition (for TransitionModal)
  executeTransition: async (formData: FormData): Promise<{ message: string }> => {
    try {
      console.log('Executing workflow transition');
      const response = await api.post('/workflow/execute-transition', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Execute transition response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error executing transition:', error);
      throw error;
    }
  },

  // Get workflow visualization
  getWorkflowVisualization: async (format: 'json' | 'mermaid' = 'json'): Promise<WorkflowVisualization> => {
    try {
      console.log('Fetching workflow visualization:', format);
      const response = await api.get('/workflow/visualization', { params: { format } });
      console.log('Workflow visualization response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow visualization:', error);
      throw error;
    }
  },

  // Get workflow history for an entity
  getWorkflowHistory: async (
    entityType: 'purchase_order' | 'invoice_receiving',
    entityId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ history: WorkflowHistoryEntry[]; pagination: any }> => {
    try {
      console.log('Fetching workflow history:', entityType, entityId, params);
      const response = await api.get(`/workflow/history/${entityType}/${entityId}`, { params });
      console.log('Workflow history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow history:', error);
      throw error;
    }
  },

  // ===== REPORTING & ANALYTICS =====
  
  // Get workflow statistics
  getWorkflowStatistics: async (params?: {
    fromDate?: string;
    toDate?: string;
    stageId?: string;
    entityType?: 'purchase_order' | 'invoice_receiving';
  }): Promise<{ statistics: WorkflowStatistics[] }> => {
    try {
      console.log('Fetching workflow statistics:', params);
      const response = await api.get('/workflow/statistics', { params });
      console.log('Workflow statistics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow statistics:', error);
      throw error;
    }
  },

  // Export workflow report
  exportWorkflowReport: async (params: {
    format: 'pdf' | 'excel' | 'csv';
    fromDate?: string;
    toDate?: string;
    includeHistory?: boolean;
  }): Promise<any> => {
    try {
      console.log('Exporting workflow report:', params);
      const response = await api.get('/workflow/export', { params });
      console.log('Export workflow report response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error exporting workflow report:', error);
      throw error;
    }
  }
};

export default workflowAPI;