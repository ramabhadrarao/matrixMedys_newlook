// src/components/QualityControl/QualityControlList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileText,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  ClipboardCheck,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { qualityControlAPI } from '../../services/qualityControlAPI';
import toast from 'react-hot-toast';
import RoleBasedAccess from '../Auth/RoleBasedAccess';
import { usePermissions } from '../../hooks/usePermissions';

interface QualityControl {
  _id: string;
  qcNumber: string;
  invoiceReceiving: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  qcType: 'incoming_inspection' | 'batch_testing' | 'random_sampling' | 'full_inspection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  overallResult: 'pending' | 'passed' | 'failed' | 'partial_pass';
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  products: Array<{
    _id: string;
    product: string;
    productCode: string;
    productName: string;
    batchNo: string;
    mfgDate: string | null;
    expDate: string | null;
    receivedQty: number;
    qcPassedQty: number;
    qcFailedQty: number;
    qcPendingQty: number;
    overallStatus: 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass';
    itemDetails: Array<{
      itemNumber: number;
      status: string;
      reason?: string;
      remarks?: string;
    }>;
    qcSummary: {
      correctlyReceived: number;
      damaged: number;
      expired: number;
      nearExpiry: number;
      wrongProduct: number;
      wrongQuantity: number;
      other: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface QCFilters {
  search: string;
  status: string;
  overallResult: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

const QualityControlList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuthStore();
  const { canPerformQC, isQCManager, canAccessModule } = usePermissions();

  // Check if user can access QC module
  if (!canAccessModule('quality_control')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Quality Control module.</p>
        </div>
      </div>
    );
  }
  
  const [qcRecords, setQcRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<QCFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    overallResult: searchParams.get('overallResult') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10')
  });

  useEffect(() => {
    loadQCRecords();
  }, [filters]);

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const loadQCRecords = async () => {
    try {
      setLoading(true);
      const response = await qualityControlAPI.getQCRecords(filters);
      setQcRecords(response.data.qcRecords || []);
      setTotalCount(response.data.totalCount || 0);
      setTotalPages(response.data.totalPages || 1);
      setCurrentPage(response.data.currentPage || 1);
    } catch (error) {
      console.error('Error loading QC records:', error);
      toast.error('Failed to load quality control records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof QCFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when other filters change
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      result: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      limit: 10
    });
  };

  const handleView = (id: string) => {
    navigate(`/quality-control/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/quality-control/${id}/edit`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial_pass':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'in_progress':
        return <ClipboardCheck className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'on_hold':
        return <AlertTriangle className="w-3 h-3" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <p className="text-gray-600 mt-1">Manage quality control processes for received products</p>
        </div>
        
        <div className="flex space-x-3">
          <RoleBasedAccess resource="quality_control" action="statistics">
            <Link
              to="/quality-control/statistics"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistics
            </Link>
          </RoleBasedAccess>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by invoice number, PO number, or principal..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <select
                  value={filters.overallResult}
                  onChange={(e) => handleFilterChange('overallResult', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Results</option>
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="partial_pass">Partial Pass</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {qcRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Quality Control Records</h3>
          <p className="text-gray-500 mb-6">
            Quality control records will appear here once invoice receivings are submitted for QC.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QC Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice & PO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {qcRecords.map((qc) => (
                  <tr key={qc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClipboardCheck className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {qc.qcNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {formatDate(qc.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {qc.invoiceReceiving.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Date: {formatDate(qc.invoiceReceiving.invoiceDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {qc.assignedTo?.name || 'Unassigned'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(qc.status)
                      }`}>
                        {getStatusIcon(qc.status)}
                        <span className="ml-1 capitalize">{qc.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getResultColor(qc.overallResult)
                      }`}>
                        <span className="capitalize">{qc.overallResult}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {qc.products.filter(product => product.overallStatus !== 'pending').length} / {qc.products.length} products
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(qc.products.filter(product => product.overallStatus !== 'pending').length / qc.products.length) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(qc._id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {hasPermission('quality_control', 'update') && 
                         (qc.status === 'pending' || qc.status === 'in_progress') && (
                          <button
                            onClick={() => handleEdit(qc._id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Edit QC"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {qcRecords.map((qc) => (
              <div key={qc._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <ClipboardCheck className="w-6 h-6 text-blue-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {qc.qcNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(qc.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(qc._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {hasPermission('quality_control', 'update') && 
                     (qc.status === 'pending' || qc.status === 'in_progress') && (
                      <button
                        onClick={() => handleEdit(qc._id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice:</span>
                    <span className="font-medium">{qc.invoiceReceiving.invoiceNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">{formatDate(qc.invoiceReceiving.invoiceDate)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned To:</span>
                    <span className="text-gray-900">{qc.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getStatusColor(qc.status)
                    }`}>
                      {getStatusIcon(qc.status)}
                      <span className="ml-1 capitalize">{qc.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Result:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getResultColor(qc.overallResult)
                    }`}>
                      <span className="capitalize">{qc.overallResult}</span>
                    </span>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress:</span>
                      <span className="text-gray-900">
                        {qc.products.filter(product => product.overallStatus !== 'pending').length} / {qc.products.length} products
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(qc.products.filter(product => product.overallStatus !== 'pending').length / qc.products.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * (filters.limit || 10)) + 1} to {Math.min(currentPage * (filters.limit || 10), totalCount)} of {totalCount} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilterChange('page', Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => handleFilterChange('page', Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QualityControlList;