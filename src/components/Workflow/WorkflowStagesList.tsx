// src/components/Workflow/WorkflowStagesList.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  ArrowRight,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { workflowAPI, WorkflowStage } from '../../services/workflowAPI';
import { useAuthStore } from '../../store/authStore';
import UserAssignmentModal from './UserAssignmentModal';
import toast from 'react-hot-toast';

const WorkflowStagesList: React.FC = () => {
  const { user } = useAuthStore();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<WorkflowStage | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const response = await workflowAPI.getWorkflowStages();
      console.log('Workflow stages API response:', response);
      
      // FIX: Properly access the stages property from the response
      const stagesData = response.stages || response.data?.stages || [];
      setStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (error: any) {
      toast.error('Failed to load workflow stages');
      console.error('Error loading stages:', error);
      setStages([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;

    try {
      await workflowAPI.deleteWorkflowStage(stageToDelete._id);
      setStages(prev => prev.filter(stage => stage._id !== stageToDelete._id));
      toast.success('Workflow stage deleted successfully');
      setDeleteModalOpen(false);
      setStageToDelete(null);
    } catch (error: any) {
      toast.error('Failed to delete workflow stage');
    }
  };

  const handleOpenAssignmentModal = (stageId: string, stageName: string) => {
    setSelectedStage({ id: stageId, name: stageName });
    setAssignmentModalOpen(true);
  };

  const handleCloseAssignmentModal = () => {
    setAssignmentModalOpen(false);
    setSelectedStage(null);
  };

  const handleAssignmentUpdate = () => {
    // Optionally reload stages or show a success message
    toast.success('Stage assignments updated');
  };

  // Add defensive check for stages array before filtering
  const filteredStages = (stages || []).filter(stage => {
    const matchesSearch = stage.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stage.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'active') return matchesSearch && stage.isActive;
    if (filterType === 'inactive') return matchesSearch && !stage.isActive;
    
    return matchesSearch;
  });

  const getStageIcon = (stage: WorkflowStage) => {
    if (!stage.isActive) return <AlertCircle className="w-5 h-5 text-gray-400" />;
    if (stage.code === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <Clock className="w-5 h-5 text-blue-600" />;
  };

  const canManageWorkflow = () => {
    return user?.permissions?.includes('workflow_management') || user?.role === 'admin';
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Stages</h1>
          <p className="text-gray-600 mt-1">
            Manage workflow stages and their transitions
          </p>
        </div>
        
        {canManageWorkflow() && (
          <Link
            to="/workflow/stages/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search stages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Filter */}
          <div className="sm:w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredStages.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflow stages found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating your first workflow stage.'}
            </p>
            {canManageWorkflow() && !searchTerm && (
              <Link
                to="/workflow/stages/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Stage
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sequence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Stages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {canManageWorkflow() && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStages.map((stage) => (
                  <tr key={stage._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStageIcon(stage)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {stage.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Code: {stage.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {stage.sequence}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {stage.requiredPermissions?.length || 0} permissions
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {stage.nextStages?.slice(0, 2).map((nextStage, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {typeof nextStage === 'string' ? nextStage : nextStage.code}
                          </span>
                        ))}
                        {stage.nextStages && stage.nextStages.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{stage.nextStages.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stage.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stage.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    {canManageWorkflow() && (
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenAssignmentModal(stage._id, stage.name)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Manage User Assignments"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          
                          <Link
                            to={`/workflow/stages/${stage._id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit Stage"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          
                          <button
                            onClick={() => {
                              setStageToDelete(stage);
                              setDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Stage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && stageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Workflow Stage
            </h3>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the stage "{stageToDelete.name}"? 
              This action cannot be undone and may affect existing workflows.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setStageToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleDeleteStage}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {assignmentModalOpen && selectedStage && (
        <UserAssignmentModal
          isOpen={assignmentModalOpen}
          onClose={handleCloseAssignmentModal}
          stageId={selectedStage.id}
          stageName={selectedStage.name}
          onAssignmentUpdate={handleAssignmentUpdate}
        />
      )}
    </div>
  );
};

export default WorkflowStagesList;