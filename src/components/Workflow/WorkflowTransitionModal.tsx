// src/components/Workflow/WorkflowTransitionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  FileText
} from 'lucide-react';
import { workflowAPI, WorkflowStage } from '../../services/workflowAPI';
import { usersAPI } from '../../services/api';
import { User as UserType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface WorkflowTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'purchase_order' | 'invoice_receiving';
  currentStage: string;
  availableActions: string[];
  onTransitionComplete?: () => void;
}

interface TransitionData {
  action: string;
  targetStage: string;
  assignedTo?: string;
  comments: string;
  attachments?: File[];
}

const WorkflowTransitionModal: React.FC<WorkflowTransitionModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
  currentStage,
  availableActions,
  onTransitionComplete
}) => {
  const { user } = useAuthStore();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [transitionData, setTransitionData] = useState<TransitionData>({
    action: '',
    targetStage: '',
    assignedTo: '',
    comments: '',
    attachments: []
  });

  useEffect(() => {
    if (isOpen) {
      loadStages();
      loadUsers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTransitionData({
      action: '',
      targetStage: '',
      assignedTo: '',
      comments: '',
      attachments: []
    });
  };

  const loadStages = async () => {
    try {
      const response = await workflowAPI.getWorkflowStages();
      setStages(response.data.filter((stage: WorkflowStage) => stage.isActive));
    } catch (error: any) {
      toast.error('Failed to load workflow stages');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getUsers({ 
        page: 1, 
        limit: 100, 
        status: 'active' 
      });
      setUsers(response.data.users);
    } catch (error: any) {
      toast.error('Failed to load users');
    }
  };

  const getAvailableTargetStages = () => {
    const currentStageObj = stages.find(stage => stage.code === currentStage);
    if (!currentStageObj || !currentStageObj.nextStages) return [];
    
    return stages.filter(stage => 
      currentStageObj.nextStages!.includes(stage.code)
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      approve: 'Approve',
      reject: 'Reject',
      cancel: 'Cancel',
      send: 'Send',
      receive: 'Receive',
      qc_pass: 'QC Pass',
      qc_fail: 'QC Fail',
      assign: 'Assign',
      reassign: 'Reassign',
      edit: 'Edit',
      complete: 'Complete'
    };
    return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      approve: 'text-green-600',
      reject: 'text-red-600',
      cancel: 'text-gray-600',
      send: 'text-blue-600',
      receive: 'text-purple-600',
      qc_pass: 'text-green-600',
      qc_fail: 'text-red-600',
      assign: 'text-indigo-600',
      reassign: 'text-orange-600',
      edit: 'text-yellow-600',
      complete: 'text-green-600'
    };
    return colors[action] || 'text-gray-600';
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      approve: <CheckCircle className="w-4 h-4" />,
      reject: <X className="w-4 h-4" />,
      cancel: <AlertCircle className="w-4 h-4" />,
      send: <Send className="w-4 h-4" />,
      receive: <ArrowRight className="w-4 h-4" />,
      qc_pass: <CheckCircle className="w-4 h-4" />,
      qc_fail: <X className="w-4 h-4" />,
      assign: <User className="w-4 h-4" />,
      reassign: <User className="w-4 h-4" />,
      edit: <FileText className="w-4 h-4" />,
      complete: <CheckCircle className="w-4 h-4" />
    };
    return icons[action] || <ArrowRight className="w-4 h-4" />;
  };

  const handleActionChange = (action: string) => {
    setTransitionData(prev => ({
      ...prev,
      action,
      targetStage: '', // Reset target stage when action changes
      assignedTo: ''
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTransitionData(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transitionData.action) {
      toast.error('Please select an action');
      return;
    }
    
    if (!transitionData.targetStage && getAvailableTargetStages().length > 0) {
      toast.error('Please select a target stage');
      return;
    }
    
    if (!transitionData.comments.trim()) {
      toast.error('Please provide comments for this transition');
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('entityId', entityId);
      formData.append('entityType', entityType);
      formData.append('action', transitionData.action);
      formData.append('targetStage', transitionData.targetStage);
      formData.append('comments', transitionData.comments);
      
      if (transitionData.assignedTo) {
        formData.append('assignedTo', transitionData.assignedTo);
      }
      
      // Add attachments
      transitionData.attachments?.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      
      await workflowAPI.executeTransition(formData);
      toast.success('Workflow transition completed successfully');
      
      if (onTransitionComplete) {
        onTransitionComplete();
      }
      
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to execute workflow transition');
    } finally {
      setSubmitting(false);
    }
  };

  const requiresAssignment = ['assign', 'reassign'].includes(transitionData.action);
  const availableTargetStages = getAvailableTargetStages();
  const currentStageObj = stages.find(stage => stage.code === currentStage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Workflow Transition
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Current Stage: {currentStageObj?.name || currentStage}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Action *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {availableActions.map(action => (
                  <label
                    key={action}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                      transitionData.action === action
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={action}
                      checked={transitionData.action === action}
                      onChange={(e) => handleActionChange(e.target.value)}
                      className="sr-only"
                    />
                    
                    <div className={`flex items-center space-x-3 ${getActionColor(action)}`}>
                      {getActionIcon(action)}
                      <span className="font-medium">
                        {getActionLabel(action)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Stage Selection */}
            {transitionData.action && availableTargetStages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Stage *
                </label>
                <select
                  value={transitionData.targetStage}
                  onChange={(e) => setTransitionData(prev => ({ ...prev, targetStage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select target stage</option>
                  {availableTargetStages.map(stage => (
                    <option key={stage._id} value={stage.code}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Assignment */}
            {requiresAssignment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To *
                </label>
                <select
                  value={transitionData.assignedTo}
                  onChange={(e) => setTransitionData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select user to assign</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments *
              </label>
              <textarea
                value={transitionData.comments}
                onChange={(e) => setTransitionData(prev => ({ ...prev, comments: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter comments for this transition..."
                required
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX
              </p>
              
              {transitionData.attachments && transitionData.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {transitionData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting || !transitionData.action || !transitionData.comments.trim()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {submitting ? 'Processing...' : 'Execute Transition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowTransitionModal;