// src/components/Workflow/UserAssignmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  User,
  Users,
  Check,
  Plus,
  Minus,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { workflowAPI } from '../../services/workflowAPI';
import { usersAPI } from '../../services/api';
import { User as UserType } from '../../types';
import toast from 'react-hot-toast';

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  onAssignmentUpdate?: () => void;
}

interface StageAssignment {
  userId: string;
  user: UserType;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  isOpen,
  onClose,
  stageId,
  stageName,
  onAssignmentUpdate
}) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [assignments, setAssignments] = useState<StageAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadAssignments();
    }
  }, [isOpen, stageId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers({ 
        page: 1, 
        limit: 100, 
        status: 'active' 
      });
      setUsers(response.data.users);
    } catch (error: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await workflowAPI.getStageAssignments(stageId);
      setAssignments(response.data);
      
      // Set currently assigned users as selected
      const assignedUserIds = response.data
        .filter((assignment: StageAssignment) => assignment.isActive)
        .map((assignment: StageAssignment) => assignment.userId);
      setSelectedUsers(new Set(assignedUserIds));
    } catch (error: any) {
      toast.error('Failed to load stage assignments');
    }
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSaveAssignments = async () => {
    try {
      setSaving(true);
      
      const assignmentData = {
        userIds: Array.from(selectedUsers)
      };
      
      await workflowAPI.updateStageAssignments(stageId, assignmentData);
      toast.success('User assignments updated successfully');
      
      if (onAssignmentUpdate) {
        onAssignmentUpdate();
      }
      
      onClose();
    } catch (error: any) {
      toast.error('Failed to update user assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const getAssignmentInfo = (userId: string) => {
    return assignments.find(assignment => 
      assignment.userId === userId && assignment.isActive
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Assign Users to Stage
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Stage: {stageName}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No users available for assignment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => {
                const isSelected = selectedUsers.has(user._id);
                const assignmentInfo = getAssignmentInfo(user._id);
                
                return (
                  <div
                    key={user._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleUserToggle(user._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isSelected ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {user.name}
                            </h4>
                            
                            {assignmentInfo && (
                              <UserCheck className="w-4 h-4 text-green-600" title="Currently assigned" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600">{user.email}</p>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {isSelected ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserToggle(user._id);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Remove from assignment"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserToggle(user._id);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Add to assignment"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedUsers.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <UserCheck className="w-4 h-4" />
              <span>
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected for assignment
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveAssignments}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAssignmentModal;