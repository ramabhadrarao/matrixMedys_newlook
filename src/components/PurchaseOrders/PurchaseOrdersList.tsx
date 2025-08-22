import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  Printer,
  MoreVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { purchaseOrderAPI } from '../../services/purchaseOrderAPI';
import { principalAPI } from '../../services/principalAPI';
import { branchAPI } from '../../services/branchAPI';
import { useAuthStore } from '../../store/authStore';

const PurchaseOrdersList: React.FC = () => {
  const { hasPermission } = useAuthStore();
  
  // State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [principals, setPrincipals] = useState<any[]>([]);
  
  const canCreate = hasPermission('purchase_orders', 'create');
  const canUpdate = hasPermission('purchase_orders', 'update');
  const canApprove = hasPermission('po_workflow', 'approve_level1');

  const statusOptions = [
    { value: '', label: 'All Status', color: '' },
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'pending_approval', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'ordered', label: 'Ordered', color: 'bg-blue-100 text-blue-800' },
    { value: 'partial_received', label: 'Partial Received', color: 'bg-orange-100 text-orange-800' },
    { value: 'received', label: 'Received', color: 'bg-purple-100 text-purple-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchPrincipals();
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage, searchTerm, selectedStatus, selectedPrincipal, dateFrom, dateTo]);

  const fetchPrincipals = async () => {
    try {
      const response = await principalAPI.getPrincipals({ limit: 100 });
      setPrincipals(response.data.principals || []);
    } catch (error) {
      console.error('Error fetching principals:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 10
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPrincipal) params.principal = selectedPrincipal;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      
      const response = await purchaseOrderAPI.getPurchaseOrders(params);
      setPurchaseOrders(response.data.purchaseOrders || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.totalCount || 0);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await purchaseOrderAPI.approvePurchaseOrder(id);
      toast.success('Purchase order approved successfully');
      fetchPurchaseOrders();
    } catch (error) {
      toast.error('Failed to approve purchase order');
    }
  };

  const handleSendToSupplier = async (id: string) => {
    try {
      await purchaseOrderAPI.sendPurchaseOrder(id);
      toast.success('Purchase order sent to supplier');
      fetchPurchaseOrders();
    } catch (error) {
      toast.error('Failed to send purchase order');
    }
  };

  const handleDownloadPO = async (id: string, poNumber: string) => {
    try {
      const response = await purchaseOrderAPI.downloadPurchaseOrder(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PO-${poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Purchase order downloaded');
    } catch (error) {
      toast.error('Failed to download purchase order');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedPrincipal('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage purchase orders and approvals
            {totalCount > 0 && ` • ${totalCount} total orders`}
          </p>
        </div>
        
        {canCreate && (
          <Link
            to="/purchase-orders/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            {(searchTerm || selectedStatus || selectedPrincipal || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Principal
                </label>
                <select
                  value={selectedPrincipal}
                  onChange={(e) => setSelectedPrincipal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Principals</option>
                  {principals.map((principal) => (
                    <option key={principal._id} value={principal._id}>
                      {principal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading purchase orders...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No purchase orders found</p>
            {searchTerm && (
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search terms or filters
              </p>
            )}
            {canCreate && (
              <Link
                to="/purchase-orders/new"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Purchase Order
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill To / Ship To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((po, index) => (
                    <motion.tr
                      key={po._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {po.poNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{po.principal?.name || 'N/A'}</div>
                        {po.principal?.email && (
                          <div className="text-xs text-gray-500">{po.principal.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {new Date(po.poDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{po.billTo?.branchWarehouse || 'N/A'}</div>
                          <div className="text-gray-500 text-xs">→ {po.shipTo?.branchWarehouse || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(po.grandTotal || 0)}
                        </div>
                        {po.products && (
                          <div className="text-xs text-gray-500">
                            {po.products.length} item(s)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(po.status)}`}>
                          {statusOptions.find(s => s.value === po.status)?.label || po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/purchase-orders/${po._id}`}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          {canUpdate && po.status === 'draft' && (
                            <Link
                              to={`/purchase-orders/${po._id}/edit`}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                          
                          {canApprove && po.status === 'pending_approval' && (
                            <button
                              onClick={() => handleApprove(po._id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {po.status === 'approved' && (
                            <button
                              onClick={() => handleSendToSupplier(po._id)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Send to Supplier"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDownloadPO(po._id, po.poNumber)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {purchaseOrders.map((po, index) => (
                <motion.div
                  key={po._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {po.poNumber}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(po.poDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(po.status)}`}>
                      {statusOptions.find(s => s.value === po.status)?.label || po.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Principal:</span>
                      <span className="ml-2 text-gray-900">{po.principal?.name || 'N/A'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Amount:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatCurrency(po.grandTotal || 0)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Items:</span>
                      <span className="ml-2 text-gray-900">{po.products?.length || 0} product(s)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/purchase-orders/${po._id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    
                    <div className="flex items-center space-x-2">
                      {canUpdate && po.status === 'draft' && (
                        <Link
                          to={`/purchase-orders/${po._id}/edit`}
                          className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {canApprove && po.status === 'pending_approval' && (
                        <button
                          onClick={() => handleApprove(po._id)}
                          className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDownloadPO(po._id, po.poNumber)}
                        className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} • {totalCount} total orders
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersList;