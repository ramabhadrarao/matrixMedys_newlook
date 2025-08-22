// src/components/Warehouses/WarehousesList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { warehouseAPI, Warehouse } from '../../services/warehouseAPI';
import { branchAPI } from '../../services/branchAPI';
import { handleApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Branch {
  _id: string;
  name: string;
}

const WarehousesList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get('branch') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [totalWarehouses, setTotalWarehouses] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('warehouses', 'create');
  const canUpdate = hasPermission('warehouses', 'update');
  const canDelete = hasPermission('warehouses', 'delete');
  const canView = hasPermission('warehouses', 'view'); // Changed from 'read' to 'view'

  const itemsPerPage = 12;

  useEffect(() => {
    if (canView) {
      fetchWarehouses();
      fetchBranches();
    }
  }, [currentPage, searchTerm, selectedBranch, canView]);

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedBranch) params.set('branch', selectedBranch);
    if (currentPage > 1) params.set('page', currentPage.toString());
    setSearchParams(params);
  }, [searchTerm, selectedBranch, currentPage, setSearchParams]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseAPI.getWarehouses({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        branch: selectedBranch
      });
      
      setWarehouses(response.data.warehouses || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalWarehouses(response.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Update the fetchBranches function:

const fetchBranches = async () => {
  try {
    const response = await branchAPI.getBranches({ limit: 100 });
    console.log('Fetched branches response:', response); // Debug log
    
    // Handle the response structure correctly
    if (response && response.data) {
      const branchesData = response.data.branches || [];
      setBranches(branchesData);
    } else {
      setBranches([]);
      console.error('Unexpected response structure:', response);
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
    handleApiError(error);
    setBranches([]); // Set empty array on error
  }
};

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleBranchFilter = (branchId: string) => {
    setSelectedBranch(branchId);
    setCurrentPage(1);
  };

  const handleDeleteWarehouse = async () => {
    if (!warehouseToDelete || !canDelete) {
      toast.error('You do not have permission to delete warehouses');
      return;
    }

    try {
      setDeleteLoading(true);
      await warehouseAPI.deleteWarehouse(warehouseToDelete._id);
      toast.success('Warehouse deleted successfully');
      setShowDeleteModal(false);
      setWarehouseToDelete(null);
      fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      handleApiError(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadDocument = async (filename: string, originalName?: string) => {
    try {
      await warehouseAPI.downloadFile(filename, originalName);
    } catch (error) {
      console.error('Error downloading document:', error);
      handleApiError(error);
    }
  };

  const handleViewDocument = (filename: string) => {
    try {
      warehouseAPI.viewFile(filename);
    } catch (error) {
      console.error('Error viewing document:', error);
      handleApiError(error);
    }
  };

  const getDocumentValidityStatus = (endDate: string) => {
    const today = new Date();
    const validity = new Date(endDate);
    const diffTime = validity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle };
    } else if (diffDays <= 30) {
      return { status: 'expiring', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
    } else {
      return { status: 'valid', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBranch('');
    setCurrentPage(1);
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view warehouses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">
            Manage warehouse locations and inventory storage facilities
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/warehouses/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search warehouses by name, code, or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Branch Filter */}
          <div className="lg:w-64">
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters */}
          {(searchTerm || selectedBranch) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {warehouses.length} of {totalWarehouses} warehouses
            {selectedBranch && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Filtered by branch
              </span>
            )}
          </span>
          
          {totalPages > 1 && (
            <span>
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : warehouses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {warehouses.map((warehouse) => (
            <motion.div
              key={warehouse._id}
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
                      <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                      {warehouse.warehouseCode && (
                        <p className="text-sm text-gray-600">{warehouse.warehouseCode}</p>
                      )}
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    warehouse.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {warehouse.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {/* Branch Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{warehouse.branch.name}</span>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">
                      {warehouse.district}, {warehouse.state.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{warehouse.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{warehouse.email}</span>
                  </div>
                </div>
                
                {/* Documents Status */}
                {warehouse.documents && warehouse.documents.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <FileText className="h-4 w-4" />
                      <span>{warehouse.documents.length} document(s)</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {warehouse.documents.slice(0, 3).map((doc) => {
                        const validityStatus = getDocumentValidityStatus(doc.validityEndDate);
                        const StatusIcon = validityStatus.icon;
                        
                        return (
                          <div
                            key={doc._id}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${validityStatus.bgColor} ${validityStatus.color}`}
                            title={`${doc.documentName} - Valid until ${new Date(doc.validityEndDate).toLocaleDateString()}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            <span className="truncate max-w-20">{doc.documentName}</span>
                          </div>
                        );
                      })}
                      
                      {warehouse.documents.length > 3 && (
                        <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{warehouse.documents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  {canView && (
                    <Link
                      to={`/warehouses/${warehouse._id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm text-center transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                  
                  {canUpdate && (
                    <Link
                      to={`/warehouses/${warehouse._id}/edit`}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Warehouse"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  )}
                  
                  {canDelete && (
                    <button
                      onClick={() => {
                        setWarehouseToDelete(warehouse);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Warehouse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedBranch
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by adding your first warehouse.'}
          </p>
          {canCreate && !searchTerm && !selectedBranch && (
            <Link
              to="/warehouses/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add First Warehouse
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                     ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && warehouseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Warehouse</h3>
                <p className="text-gray-600">Are you sure you want to delete this warehouse?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{warehouseToDelete.name}</p>
              <p className="text-sm text-gray-600">
                {warehouseToDelete.district}, {warehouseToDelete.state.name}
              </p>
              <p className="text-sm text-gray-600">Branch: {warehouseToDelete.branch.name}</p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWarehouseToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWarehouse}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesList;