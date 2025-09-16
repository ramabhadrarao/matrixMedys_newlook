// src/components/Workflow/WorkflowStageForm.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Plus,
  X,
  Users,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { workflowAPI, WorkflowStage } from '../../services/workflowAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface WorkflowStageFormData {
  name: string;
  code: string;
  description: string;
  sequence: number;
  isActive: boolean;
  requiredPermissions: string[];
  nextStages: string[];
  allowedActions: string[];
  autoTransitionRules?: {
    condition: string;
    targetStage: string;
  }[];
}

const WorkflowStageForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isEditing = Boolean(id && id !== 'new');
  
  const [formData, setFormData] = useState<WorkflowStageFormData>({
    name: '',
    code: '',
    description: '',
    sequence: 1,
    isActive: true,
    requiredPermissions: [],
    nextStages: [],
    allowedActions: [],
    autoTransitionRules: []
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableStages, setAvailableStages] = useState<WorkflowStage[]>([]);
  const [newPermission, setNewPermission] = useState('');
  const [newNextStage, setNewNextStage] = useState('');
  const [newAction, setNewAction] = useState('');

  const availablePermissions = [
    'purchase_order_create',
    'purchase_order_edit',
    'purchase_order_approve',
    'purchase_order_reject',
    'purchase_order_cancel',
    'purchase_order_send',
    'invoice_receiving_create',
    'invoice_receiving_edit',
    'invoice_receiving_qc',
    'workflow_management',
    'user_management',
    'admin'
  ];

  const availableActions = [
    'approve',
    'reject',
    'cancel',
    'send',
    'edit',
    'receive',
    'qc_pass',
    'qc_fail',
    'assign',
    'reassign'
  ];

  useEffect(() => {
    loadAvailableStages();
    if (isEditing && id && id !== 'new') {
      loadStage();
    }
  }, [id, isEditing]);

  const loadAvailableStages = async () => {
    try {
      const response = await workflowAPI.getWorkflowStages();
      console.log('Available stages response:', response);
      const stagesData = response.stages || response.data?.stages || [];
      setAvailableStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (error: any) {
      console.error('Error loading available stages:', error);
      toast.error('Failed to load available stages');
    }
  };

  const loadStage = async () => {
    if (!id || id === 'new') return;
    
    try {
      setLoading(true);
      const response = await workflowAPI.getWorkflowStage(id);
      console.log('Stage response:', response);
      const stage = response.stage || response.data?.stage;
      
      if (stage) {
        setFormData({
          name: stage.name || '',
          code: stage.code || '',
          description: stage.description || '',
          sequence: stage.sequence || 1,
          isActive: stage.isActive !== undefined ? stage.isActive : true,
          requiredPermissions: stage.requiredPermissions?.map((p: any) => 
            typeof p === 'string' ? p : p._id || p.name
          ) || [],
          nextStages: stage.nextStages?.map((s: any) => 
            typeof s === 'string' ? s : s._id || s.code
          ) || [],
          allowedActions: stage.allowedActions || [],
          autoTransitionRules: stage.autoTransitionRules || []
        });
      }
    } catch (error: any) {
      console.error('Error loading workflow stage:', error);
      toast.error('Failed to load workflow stage');
      navigate('/workflow/stages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.name.trim() || !formData.code.trim()) {
    toast.error('Name and code are required');
    return;
  }

  if (formData.allowedActions.length === 0) {
    toast.error('At least one allowed action is required');
    return;
  }

  try {
    setSaving(true);
    
    const submitData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      sequence: formData.sequence,
      isActive: formData.isActive,
      requiredPermissions: formData.requiredPermissions,
      allowedActions: formData.allowedActions,
      nextStages: formData.nextStages
    };
    
    // DEBUG: Log the exact data being sent
    console.log('=== SUBMIT DATA DEBUG ===');
    console.log('Full submitData:', JSON.stringify(submitData, null, 2));
    console.log('requiredPermissions type:', typeof submitData.requiredPermissions);
    console.log('requiredPermissions value:', submitData.requiredPermissions);
    console.log('requiredPermissions length:', submitData.requiredPermissions?.length);
    console.log('allowedActions:', submitData.allowedActions);
    console.log('nextStages:', submitData.nextStages);
    console.log('=== END DEBUG ===');
    
    if (isEditing && id && id !== 'new') {
      await workflowAPI.updateWorkflowStage(id, submitData);
      toast.success('Workflow stage updated successfully');
    } else {
      await workflowAPI.createWorkflowStage(submitData);
      toast.success('Workflow stage created successfully');
    }
    
    navigate('/workflow/stages');
  } catch (error: any) {
    console.error('Error saving workflow stage:', error);
    
    // DEBUG: Log the full error details
    console.log('=== ERROR DEBUG ===');
    console.log('Error message:', error.message);
    console.log('Error response status:', error.response?.status);
    console.log('Error response data:', error.response?.data);
    console.log('Error response headers:', error.response?.headers);
    console.log('=== END ERROR DEBUG ===');
    
    toast.error(error.response?.data?.message || 'Failed to save workflow stage');
  } finally {
    setSaving(false);
  }
};
  const addPermission = () => {
    if (newPermission && !formData.requiredPermissions.includes(newPermission)) {
      setFormData(prev => ({
        ...prev,
        requiredPermissions: [...prev.requiredPermissions, newPermission]
      }));
      setNewPermission('');
    }
  };

  const removePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      requiredPermissions: prev.requiredPermissions.filter(p => p !== permission)
    }));
  };

  const addNextStage = () => {
    if (newNextStage && !formData.nextStages.includes(newNextStage)) {
      setFormData(prev => ({
        ...prev,
        nextStages: [...prev.nextStages, newNextStage]
      }));
      setNewNextStage('');
    }
  };

  const removeNextStage = (stage: string) => {
    setFormData(prev => ({
      ...prev,
      nextStages: prev.nextStages.filter(s => s !== stage)
    }));
  };

  const addAction = () => {
    if (newAction && !formData.allowedActions.includes(newAction)) {
      setFormData(prev => ({
        ...prev,
        allowedActions: [...prev.allowedActions, newAction]
      }));
      setNewAction('');
    }
  };

  const removeAction = (action: string) => {
    setFormData(prev => ({
      ...prev,
      allowedActions: prev.allowedActions.filter(a => a !== action)
    }));
  };

  const canManageWorkflow = () => {
    return user?.permissions?.includes('workflow_management') || 
           user?.permissions?.includes('workflow_stages:create') ||
           user?.permissions?.includes('workflow_stages:update') ||
           user?.role === 'admin';
  };

  if (!canManageWorkflow()) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to manage workflow stages.</p>
        <button
          onClick={() => navigate('/workflow/stages')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Stages
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/workflow/stages')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Workflow Stage' : 'Create Workflow Stage'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update stage configuration' : 'Define a new workflow stage'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter stage name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter stage code (e.g., DRAFT, REVIEW)"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sequence
              </label>
              <input
                type="number"
                value={formData.sequence}
                onChange={(e) => setFormData(prev => ({ ...prev, sequence: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Active Stage</span>
              </label>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter stage description"
            />
          </div>
        </div>

        {/* Allowed Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Allowed Actions *
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select action to add</option>
                {availableActions
                  .filter(action => !formData.allowedActions.includes(action))
                  .map(action => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))
                }
              </select>
              
              <button
                type="button"
                onClick={addAction}
                disabled={!newAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.allowedActions.map(action => (
                <span
                  key={action}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                >
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <button
                    type="button"
                    onClick={() => removeAction(action)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            
            {formData.allowedActions.length === 0 && (
              <p className="text-sm text-red-600">At least one action is required</p>
            )}
          </div>
        </div>

        {/* Required Permissions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Required Permissions
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <select
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select permission to add</option>
                {availablePermissions
                  .filter(permission => !formData.requiredPermissions.includes(permission))
                  .map(permission => (
                    <option key={permission} value={permission}>
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))
                }
              </select>
              
              <button
                type="button"
                onClick={addPermission}
                disabled={!newPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.requiredPermissions.map(permission => (
                <span
                  key={permission}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <button
                    type="button"
                    onClick={() => removePermission(permission)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Next Stages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Stages</h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <select
                value={newNextStage}
                onChange={(e) => setNewNextStage(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select next stage</option>
                {availableStages
                  .filter(stage => stage.code !== formData.code && !formData.nextStages.includes(stage.code))
                  .map(stage => (
                    <option key={stage._id} value={stage.code}>
                      {stage.name}
                    </option>
                  ))
                }
              </select>
              
              <button
                type="button"
                onClick={addNextStage}
                disabled={!newNextStage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.nextStages.map(stageCode => {
                const stage = availableStages.find(s => s.code === stageCode);
                return (
                  <span
                    key={stageCode}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {stage?.name || stageCode}
                    <button
                      type="button"
                      onClick={() => removeNextStage(stageCode)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pb-6">
          <button
            type="button"
            onClick={() => navigate('/workflow/stages')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving || formData.allowedActions.length === 0}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : (isEditing ? 'Update Stage' : 'Create Stage')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkflowStageForm;