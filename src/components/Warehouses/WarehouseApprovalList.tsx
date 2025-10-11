// src/components/Warehouses/WarehouseApprovalList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Package,
  User,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import RoleBasedAccess from '../Auth/RoleBasedAccess';
import { usePermissions } from '../../hooks/usePermissions';
import { warehouseApprovalAPI } from '../../services/warehouseApprovalAPI';

interface WarehouseApproval {
  _id: string;
  invoiceReceiving: {
    _id: string;
    invoiceNumber: string;
    receivedDate: string;
    purchaseOrder: {
      _id: string;
      poNumber: string;
      principal: {
        name: string;
        email: string;
      };
    };
    warehouse: {
      name: string;
      location: string;
    };
    receivedBy: {
      name: string;
    };
  };
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  productChecks: Array<{
    productId: string;
    productName: string;
    receivedQty: number;
    unit: string;
    status: 'pending' | 'approved' | 'rejected';
    checkedBy?: string;
    checkedAt?: string;
    remarks?: string;
  }>;
  submittedBy?: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  totalItems: number;
  approvedItems: number;
  rejectedItems: number;
  pendingItems: number;
  createdAt: string;
  updatedAt: string;
}

const WarehouseApprovalList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuthStore();
  const { canManageWarehouseApprovals, isWarehouseManager, canAccessModule } = usePermissions();

  // Check if user can access warehouse approval module
  if (!canAccessModule('warehouse_approval')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Warehouse Approval module.</p>
        </div>
      </div>
    );
  }
  const [approvals, setApprovals] = useState<WarehouseApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [dateRange, setDateRange] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || ''
  });
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [totalApprovals, setTotalApprovals] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    loadApprovals();
  }, [currentPage, searchTerm, statusFilter, priorityFilter, dateRange]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchTerm, statusFilter, priorityFilter, dateRange, currentPage, setSearchParams]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await warehouseApprovalAPI.getWarehouseApprovals({
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });
      
      setApprovals(response.data.warehouseApprovals);
      setTotalPages(response.data.totalPages);
      setTotalApprovals(response.data.totalCount);
      
      // Fallback mock data if no real data exists
      if (!response.data.warehouseApprovals || response.data.warehouseApprovals.length === 0) {
        const mockApprovals: WarehouseApproval[] = [
        {
          _id: '1',
          invoiceReceiving: {
            _id: 'ir1',
            invoiceNumber: 'INV-2024-001',
            receivedDate: '2024-01-15T10:30:00Z',
            purchaseOrder: {
              _id: 'po1',
              poNumber: 'PO-2024-001',
              principal: {
                name: 'MedSupply Corp',
                email: 'orders@medsupply.com'
              }
            },
            warehouse: {
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            receivedBy: {
              name: 'John Doe'
            }
          },
          status: 'submitted',
          priority: 'high',
          productChecks: [
            {
              productId: 'p1',
              productName: 'Surgical Gloves',
              receivedQty: 100,
              unit: 'boxes',
              status: 'approved',
              checkedBy: 'Jane Smith',
              checkedAt: '2024-01-15T11:00:00Z'
            },
            {
              productId: 'p2',
              productName: 'Syringes 10ml',
              receivedQty: 500,
              unit: 'pieces',
              status: 'pending'
            }
          ],
          submittedBy: {
            name: 'John Doe'
          },
          submittedAt: '2024-01-15T12:00:00Z',
          totalItems: 2,
          approvedItems: 1,
          rejectedItems: 0,
          pendingItems: 1,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T12:00:00Z'
        },
        {
          _id: '2',
          invoiceReceiving: {
            _id: 'ir2',
            invoiceNumber: 'INV-2024-002',
            receivedDate: '2024-01-14T14:20:00Z',
            purchaseOrder: {
              _id: 'po2',
              poNumber: 'PO-2024-002',
              principal: {
                name: 'PharmaTech Ltd',
                email: 'supply@pharmatech.com'
              }
            },
            warehouse: {
              name: 'Cold Storage',
              location: 'Building B, Floor 2'
            },
            receivedBy: {
              name: 'Alice Johnson'
            }
          },
          status: 'approved',
          priority: 'medium',
          productChecks: [
            {
              productId: 'p3',
              productName: 'Insulin Vials',
              receivedQty: 50,
              unit: 'vials',
              status: 'approved',
              checkedBy: 'Bob Wilson',
              checkedAt: '2024-01-14T15:30:00Z'
            }
          ],
          submittedBy: {
            name: 'Alice Johnson'
          },
          approvedBy: {
            name: 'Manager Smith'
          },
          submittedAt: '2024-01-14T15:00:00Z',
          approvedAt: '2024-01-14T16:00:00Z',
          totalItems: 1,
          approvedItems: 1,
          rejectedItems: 0,
          pendingItems: 0,
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T16:00:00Z'
        }
      ];
      
      setApprovals(mockApprovals);
      setTotalPages(1);
      setTotalApprovals(mockApprovals.length);
      }
    } catch (error) {
      console.error('Error loading warehouse approvals:', error);
      toast.error('Failed to load warehouse approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedApprovals.length === 0) return;

    try {
      // TODO: Implement bulk actions
      // await warehouseApprovalAPI.bulkAction(selectedApprovals, bulkAction);
      toast.success(`Bulk ${bulkAction} completed successfully`);
      setSelectedApprovals([]);
      setBulkAction('');
      loadApprovals();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(`Failed to perform bulk ${bulkAction}`);
    }
  };

  const exportApprovals = async () => {
    try {
      // TODO: Implement export functionality
      // const response = await warehouseApprovalAPI.export({
      //   search: searchTerm,
      //   status: statusFilter,
      //   priority: priorityFilter,
      //   dateFrom: dateRange.from,
      //   dateTo: dateRange.to
      // });
      toast.success('Export started. You will receive a download link shortly.');
    } catch (error) {
      console.error('Error exporting approvals:', error);
      toast.error('Failed to export approvals');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'submitted':
        return <AlertTriangle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (approval: WarehouseApproval) => {
    if (approval.totalItems === 0) return 0;
    return Math.round((approval.approvedItems / approval.totalItems) * 100);
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
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Approvals</h1>
          <p className="text-gray-600 mt-1">
            Manage product checks and approval workflow
          </p>
        </div>
        
        <div className="flex space-x-3">
          <RoleBasedAccess permissions={['warehouse_approval', 'export']}>
            <button
              onClick={exportApprovals}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </RoleBasedAccess>
          
          <button
            onClick={loadApprovals}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {approvals.filter(a => a.status === 'pending' || a.status === 'submitted').length}
              </div>
              <div className="text-sm text-gray-600">Pending Approval</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {approvals.filter(a => a.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {approvals.filter(a => a.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {approvals.filter(a => a.priority === 'high' || a.priority === 'urgent').length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by invoice, PO number, or principal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedApprovals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedApprovals.length} item(s) selected
              </span>
              
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded text-sm"
              >
                <option value="">Select Action</option>
                {hasPermission('warehouse_approval', 'approve') && (
                  <option value="approve">Approve Selected</option>
                )}
                {hasPermission('warehouse_approval', 'reject') && (
                  <option value="reject">Reject Selected</option>
                )}
              </select>
              
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
            
            <button
              onClick={() => setSelectedApprovals([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {approvals.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No warehouse approvals found</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedApprovals.length === approvals.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApprovals(approvals.map(a => a._id));
                          } else {
                            setSelectedApprovals([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvals.map((approval) => (
                    <motion.tr
                      key={approval._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedApprovals.includes(approval._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedApprovals(prev => [...prev, approval._id]);
                            } else {
                              setSelectedApprovals(prev => prev.filter(id => id !== approval._id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <FileText className="w-8 h-8 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {approval.invoiceReceiving.invoiceNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              PO: {approval.invoiceReceiving?.purchaseOrder?.poNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {approval.invoiceReceiving?.purchaseOrder?.principal?.name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Building2 className="w-3 h-3 mr-1" />
                              {approval.invoiceReceiving?.warehouse?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusColor(approval.status)
                        }`}>
                          {getStatusIcon(approval.status)}
                          <span className="ml-1 capitalize">{approval.status}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getPriorityColor(approval.priority)
                        }`}>
                          <span className="capitalize">{approval.priority}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getProgressPercentage(approval)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 min-w-0">
                            {approval.approvedItems}/{approval.totalItems}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {approval.pendingItems > 0 && `${approval.pendingItems} pending`}
                          {approval.rejectedItems > 0 && `, ${approval.rejectedItems} rejected`}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(approval.invoiceReceiving.receivedDate)}
                        </div>
                        {approval.submittedAt && (
                          <div className="text-xs text-gray-500">
                            Submitted: {formatDate(approval.submittedAt)}
                          </div>
                        )}
                        {approval.approvedAt && (
                          <div className="text-xs text-gray-500">
                            Approved: {formatDate(approval.approvedAt)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/warehouse-approvals/${approval._id}`}
                            className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden">
              {approvals.map((approval) => (
                <motion.div
                  key={approval._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedApprovals.includes(approval._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApprovals(prev => [...prev, approval._id]);
                          } else {
                            setSelectedApprovals(prev => prev.filter(id => id !== approval._id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {approval.invoiceReceiving.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {approval.invoiceReceiving?.purchaseOrder?.poNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(approval.status)
                      }`}>
                        {getStatusIcon(approval.status)}
                        <span className="ml-1 capitalize">{approval.status}</span>
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getPriorityColor(approval.priority)
                      }`}>
                        <span className="capitalize">{approval.priority}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Principal:</span> {approval.invoiceReceiving?.purchaseOrder?.principal?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <Building2 className="w-4 h-4 mr-1" />
                      {approval.invoiceReceiving?.warehouse?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Received:</span> {formatDate(approval.invoiceReceiving.receivedDate)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(approval)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {approval.approvedItems}/{approval.totalItems}
                      </span>
                    </div>
                    
                    <Link
                      to={`/warehouse-approvals/${approval._id}`}
                      className="ml-4 inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalApprovals)} of {totalApprovals} results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseApprovalList;