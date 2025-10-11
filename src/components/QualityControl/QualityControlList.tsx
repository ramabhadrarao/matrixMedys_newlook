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
  AlertTriangle,
  ClipboardCheck,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { qualityControlAPI } from '../../services/qualityControlAPI';
import toast from 'react-hot-toast';

interface QualityControl {
  _id: string;
  qcNumber: string;
  invoiceReceiving?: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
  };
  purchaseOrder?: {
    _id: string;
    poNumber: string;
    poDate: string;
  };
  status: 'pending' | 'in_progress' | 'pending_approval' | 'completed' | 'rejected';
  qcType: 'standard' | 'urgent' | 'special';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  overallResult: 'pending' | 'passed' | 'failed' | 'partial_pass';
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  products: Array<{
    _id: string;
    productName: string;
    overallStatus: 'pending' | 'in_progress' | 'passed' | 'failed' | 'partial_pass';
  }>;
  createdAt: string;
  updatedAt: string;
}

interface QCFilters {
  search: string;
  status: string;
  result: string;
  qcType: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}

const QualityControlList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuthStore();
  
  const [qcRecords, setQcRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<QCFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    result: searchParams.get('result') || '',
    qcType: searchParams.get('qcType') || '',
    priority: searchParams.get('priority') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10')
  });

  // Normalize QC record to ensure all required fields exist
  const normalizeQCRecord = (record: any): QualityControl => {
    return {
      _id: record._id || '',
      qcNumber: record.qcNumber || 'N/A',
      invoiceReceiving: record.invoiceReceiving || undefined,
      purchaseOrder: record.purchaseOrder || undefined,
      status: record.status || 'pending',
      qcType: record.qcType || 'standard',
      priority: record.priority || 'medium',
      overallResult: record.overallResult || 'pending',
      assignedTo: record.assignedTo || undefined,
      products: Array.isArray(record.products) ? record.products : [],
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString()
    };
  };

  useEffect(() => {
    loadQCRecords();
  }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const loadQCRecords = async () => {
    try {
      setLoading(true);
      
      // Filter out empty values
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as any);
      
      console.log('Fetching QC records with filters:', cleanFilters);
      
      const response = await qualityControlAPI.getQCRecords(cleanFilters);
      
      console.log('QC API Response:', response);
      
      if (response.success) {
        const records = response.data.qcRecords || [];
        
        // Debug: Check first record structure
        if (records.length > 0) {
          console.log('First QC record:', {
            id: records[0]._id,
            qcNumber: records[0].qcNumber,
            invoiceReceiving: records[0].invoiceReceiving,
            purchaseOrder: records[0].purchaseOrder,
            assignedTo: records[0].assignedTo
          });
        }
        
        // Normalize records to ensure safety
        const normalizedRecords = records.map(normalizeQCRecord);
        
        setQcRecords(normalizedRecords);
        setTotalCount(response.data.totalCount || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
      } else {
        toast.error(response.message || 'Failed to load QC records');
      }
    } catch (error: any) {
      console.error('Error loading QC records:', error);
      toast.error(error.message || 'Failed to load quality control records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof QCFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      result: '',
      qcType: '',
      priority: '',
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
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
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
      case 'pending_approval':
        return <AlertTriangle className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'rejected':
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

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
          {hasPermission('quality_control', 'view') && (
            <Link
              to="/quality-control/statistics"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistics
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by QC number or invoice number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <option value="pending_approval">Pending Approval</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <select
                  value={filters.result}
                  onChange={(e) => handleFilterChange('result', e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.qcType}
                  onChange={(e) => handleFilterChange('qcType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="special">Special</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
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
                {qcRecords.map((qc) => {
                  // Filter out products with zero received quantity
                  const validProducts = qc.products.filter(p => p.receivedQty > 0);
                  const completedProducts = validProducts.filter(p => p.overallStatus !== 'pending').length;
                  const progress = validProducts.length > 0 ? (completedProducts / validProducts.length) * 100 : 0;
                  
                  return (
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
                      
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {qc.invoiceReceiving?.invoiceNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          PO: {qc.purchaseOrder?.poNumber || 'N/A'}
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
                          <span className="ml-1">{formatStatusLabel(qc.status)}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getResultColor(qc.overallResult)
                        }`}>
                          <span className="capitalize">{formatStatusLabel(qc.overallResult)}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {completedProducts} / {validProducts.length} products
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {qcRecords.map((qc) => {
              // Filter out products with zero received quantity
              const validProducts = qc.products.filter(p => p.receivedQty > 0);
              const completedProducts = validProducts.filter(p => p.overallStatus !== 'pending').length;
              const progress = validProducts.length > 0 ? (completedProducts / validProducts.length) * 100 : 0;
              
              return (
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
                      <span className="font-medium">{qc.invoiceReceiving?.invoiceNumber || 'N/A'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">PO:</span>
                      <span className="text-gray-900">{qc.purchaseOrder?.poNumber || 'N/A'}</span>
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
                        <span className="ml-1">{formatStatusLabel(qc.status)}</span>
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Result:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getResultColor(qc.overallResult)
                      }`}>
                        <span className="capitalize">{formatStatusLabel(qc.overallResult)}</span>
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress:</span>
                        <span className="text-gray-900">
                          {completedProducts} / {validProducts.length} products
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * filters.limit) + 1} to {Math.min(currentPage * filters.limit, totalCount)} of {totalCount} results
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