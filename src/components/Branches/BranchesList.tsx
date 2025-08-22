// src/components/Branches/BranchesList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Users,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  FolderOpen,
  Files,
  Warehouse
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { branchAPI, Branch } from '../../services/branchAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const BranchesList: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBranches, setTotalBranches] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const canCreate = hasPermission('branches', 'create');
  const canUpdate = hasPermission('branches', 'update');
  const canDelete = hasPermission('branches', 'delete');
  const canView = hasPermission('branches', 'view');

  // Fetch branches data
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm.trim() })
      };
      
      const response = await branchAPI.getBranches(params);
      
      if (response.data) {
        setBranches(response.data.branches || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalBranches(response.data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      handleApiError(error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBranches();
  }, [currentPage]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchBranches();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle delete
  const handleDelete = async () => {
    if (!branchToDelete) return;
    
    try {
      setDeleteLoading(true);
      await branchAPI.deleteBranch(branchToDelete._id);
      toast.success('Branch deleted successfully');
      setShowDeleteModal(false);
      setBranchToDelete(null);
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle file download
  const handleDownload = async (filename: string, originalName?: string) => {
    try {
      await branchAPI.downloadFile(filename, originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
      handleApiError(error);
    }
  };

  // Handle file view
  const handleView = (filename: string) => {
    try {
      branchAPI.viewFile(filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      handleApiError(error);
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600 mt-1">
            Manage your branch locations and details
          </p>
        </div>
        {canCreate && (
          <Link
            to="/branches/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </Link>
        )}
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-600">
            Total: {totalBranches} branches
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <motion.div
            key={branch._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {branch.name}
                    </h3>
                    {branch.branchCode && (
                      <p className="text-sm text-gray-500">
                        Code: {branch.branchCode}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {branch.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{branch.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">
                    {branch.city}, {branch.state?.name}
                  </span>
                </div>
              </div>

              {/* License Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">DL: {branch.drugLicenseNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  <span className="truncate">GST: {branch.gstNumber}</span>
                </div>
              </div>

              {/* Documents */}
              {branch.documents && branch.documents.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Files className="h-4 w-4" />
                    <span>{branch.documents.length} document(s)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {branch.documents.slice(0, 3).map((doc) => (
                      <div key={doc._id} className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(doc.filename)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          title={`View ${doc.documentName}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {doc.documentName.substring(0, 10)}...
                        </button>
                      </div>
                    ))}
                    {branch.documents.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{branch.documents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {canView && (
                    <Link
                      to={`/branches/${branch._id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  )}
                  {canUpdate && (
                    <Link
                      to={`/branches/${branch._id}/edit`}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Branch"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  )}
                  <Link
                    to={`/branches/${branch._id}/warehouses`}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Manage Warehouses"
                  >
                    <Warehouse className="h-4 w-4" />
                  </Link>
                </div>
                {canDelete && (
                  <button
                    onClick={() => {
                      setBranchToDelete(branch);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Branch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {branches.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No branches found' : 'No branches yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first branch'}
          </p>
          {canCreate && !searchTerm && (
            <Link
              to="/branches/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Branch
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && branchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Branch
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{branchToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setBranchToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesList;