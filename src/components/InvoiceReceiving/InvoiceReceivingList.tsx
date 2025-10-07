// src/components/InvoiceReceiving/InvoiceReceivingList.tsx - COMPLETE WORKING VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
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
  Truck,
  Trash2,
  AlertTriangle,
  Send,
  ClipboardCheck
} from 'lucide-react';
import { invoiceReceivingAPI, InvoiceReceiving, InvoiceReceivingFilters } from '../../services/invoiceReceivingAPI';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const InvoiceReceivingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, user } = useAuthStore();
  
  const [invoiceReceivings, setInvoiceReceivings] = useState<InvoiceReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceivings, setSelectedReceivings] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<InvoiceReceivingFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    qcStatus: searchParams.get('qcStatus') || '',
    purchaseOrder: searchParams.get('po') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10')
  });

  useEffect(() => {
    loadInvoiceReceivings();
  }, [filters]);

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const loadInvoiceReceivings = async () => {
    try {
      setLoading(true);
      const response = await invoiceReceivingAPI.getInvoiceReceivings(filters);
      
      // Handle the nested data structure
      const receivingsData = response.data;
      setInvoiceReceivings(receivingsData.invoiceReceivings || []);
      setTotalCount(receivingsData.totalCount || 0);
      setCurrentPage(receivingsData.currentPage || filters.page || 1);
      
      const limit = filters.limit || 10;
      const totalPgs = Math.ceil((receivingsData.totalCount || 0) / limit);
      setTotalPages(totalPgs);
      
    } catch (error: any) {
      console.error('Error loading invoice receivings:', error);
      toast.error('Failed to load invoice receivings');
      setInvoiceReceivings([]);
      setTotalCount(0);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof InvoiceReceivingFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when other filters change
    }));
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      qcStatus: '',
      purchaseOrder: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      limit: 10
    });
  };

  const handleView = (id: string) => {
    navigate(`/invoice-receiving/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/invoice-receiving/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    try {
      await invoiceReceivingAPI.deleteInvoiceReceiving(id);
      toast.success('Invoice receiving deleted successfully');
      loadInvoiceReceivings();
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice receiving');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedReceivings.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    switch (action) {
      case 'delete':
        if (confirm(`Are you sure you want to delete ${selectedReceivings.length} items?`)) {
          try {
            await Promise.all(selectedReceivings.map(id => invoiceReceivingAPI.deleteInvoiceReceiving(id)));
            toast.success(`${selectedReceivings.length} items deleted successfully`);
            setSelectedReceivings([]);
            loadInvoiceReceivings();
          } catch (error) {
            toast.error('Failed to delete some items');
          }
        }
        break;
      case 'export':
        handleBulkExport();
        break;
    }
  };

  const handleBulkExport = () => {
    const selectedData = invoiceReceivings.filter(r => selectedReceivings.includes(r._id));
    generatePDF(selectedData, 'bulk-invoice-receivings.pdf');
  };

  const handleDownload = async (receiving: InvoiceReceiving) => {
    try {
      setDownloadingId(receiving._id);
      
      // Generate PDF for single invoice receiving
      generatePDF([receiving], `invoice-receiving-${receiving.invoiceNumber}.pdf`);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const generatePDF = (receivings: InvoiceReceiving[], filename: string) => {
    const doc = new jsPDF();
    
    receivings.forEach((receiving, index) => {
      if (index > 0) doc.addPage();
      
      // Header
      doc.setFontSize(20);
      doc.text('Invoice Receiving Report', 14, 20);
      
      // Invoice Details
      doc.setFontSize(12);
      doc.text(`Invoice Number: ${receiving.invoiceNumber}`, 14, 35);
      doc.text(`Date: ${formatDate(receiving.receivedDate)}`, 14, 42);
      doc.text(`Supplier: ${receiving.supplier}`, 14, 49);
      doc.text(`Status: ${getStatusLabel(receiving.status)}`, 14, 56);
      
      if (typeof receiving.purchaseOrder === 'object') {
        doc.text(`PO Number: ${receiving.purchaseOrder.poNumber}`, 14, 63);
      }
      
      if (receiving.invoiceAmount) {
        doc.text(`Amount: ${formatCurrency(receiving.invoiceAmount)}`, 14, 70);
      }
      
      // Products Table
      if (receiving.receivedProducts && receiving.receivedProducts.length > 0) {
        const tableData = receiving.receivedProducts.map(product => [
          product.productName || '',
          product.productCode || '',
          product.orderedQuantity || 0,
          product.receivedQuantity || 0,
          product.unit || 'PCS',
          product.batchNumber || '',
          product.qcStatus || 'pending'
        ]);
        
        doc.autoTable({
          startY: 80,
          head: [['Product', 'Code', 'Ordered', 'Received', 'Unit', 'Batch', 'QC Status']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }
      
      // QC Information
      if (receiving.qcRequired) {
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.text(`QC Status: ${getQCStatusLabel(receiving.qcStatus || 'pending')}`, 14, finalY + 10);
        if (receiving.qcRemarks) {
          doc.text(`QC Remarks: ${receiving.qcRemarks}`, 14, finalY + 17);
        }
      }
      
      // Footer
      doc.setFontSize(10);
      doc.text(`Generated by: ${user?.name || 'System'}`, 14, 280);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 285);
    });
    
    // Save the PDF
    doc.save(filename);
  };

  const handleSubmitToQC = async (id: string) => {
    try {
      await invoiceReceivingAPI.submitToQC(id);
      toast.success('Successfully submitted to QC');
      loadInvoiceReceivings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit to QC');
    }
  };

  const canEdit = (receiving: InvoiceReceiving) => {
    return hasPermission('invoice_receiving', 'update') && 
           ['draft', 'submitted'].includes(receiving.status);
  };

  const canDelete = (receiving: InvoiceReceiving) => {
    return hasPermission('invoice_receiving', 'delete') && 
           receiving.status === 'draft';
  };

  const canSubmitQC = (receiving: InvoiceReceiving) => {
    return hasPermission('invoice_receiving', 'qc_submit') && 
           receiving.status === 'draft' && 
           receiving.qcRequired;
  };

  const getStatusColor = (status: string) => {
    return invoiceReceivingAPI.getStatusBadgeColor(status);
  };

  const getQCStatusColor = (qcStatus: string) => {
    return invoiceReceivingAPI.getQCStatusBadgeColor(qcStatus);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return FileText;
      case 'submitted':
      case 'qc_pending':
        return Clock;
      case 'completed':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      default:
        return FileText;
    }
  };

  const formatDate = (date: string) => {
    return invoiceReceivingAPI.formatDate(date);
  };

  const formatCurrency = (amount: number) => {
    return invoiceReceivingAPI.formatCurrency(amount);
  };

  const getStatusLabel = (status: string) => {
    return invoiceReceivingAPI.getStatusLabel(status);
  };

  const getQCStatusLabel = (qcStatus: string) => {
    return invoiceReceivingAPI.getQCStatusLabel(qcStatus);
  };

  const toggleSelectAll = () => {
    if (selectedReceivings.length === invoiceReceivings.length) {
      setSelectedReceivings([]);
    } else {
      setSelectedReceivings(invoiceReceivings.map(r => r._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedReceivings(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Receiving</h1>
          <p className="text-gray-600 mt-1">
            Manage product receiving and quality control
          </p>
        </div>
        
        <div className="flex space-x-3">
          {selectedReceivings.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedReceivings.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('export')}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Export Selected
              </button>
              {hasPermission('invoice_receiving', 'delete') && (
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Selected
                </button>
              )}
            </div>
          )}
          
          {hasPermission('invoice_receiving', 'create') && (
            <Link
              to="/invoice-receiving/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Receiving
            </Link>
          )}
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
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by invoice number, PO number, or supplier..."
              />
            </div>
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showFilters 
                ? 'border-blue-300 bg-blue-50 text-blue-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="qc_pending">QC Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QC Status
                </label>
                <select
                  value={filters.qcStatus}
                  onChange={(e) => handleFilterChange('qcStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All QC Status</option>
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="partial">Partial Pass</option>
                  <option value="not_required">Not Required</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : invoiceReceivings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoice receivings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(v => v) 
                ? 'Try adjusting your search criteria'
                : 'Get started by creating a new invoice receiving'}
            </p>
            {hasPermission('invoice_receiving', 'create') && (
              <div className="mt-6">
                <Link
                  to="/invoice-receiving/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Receiving
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedReceivings.length === invoiceReceivings.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QC Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceReceivings.map((receiving) => {
                    const StatusIcon = getStatusIcon(receiving.status);
                    const totalReceived = receiving.receivedProducts?.reduce((sum, p) => sum + (p.receivedQuantity || 0), 0) || 0;
                    const totalOrdered = receiving.receivedProducts?.reduce((sum, p) => sum + (p.orderedQuantity || 0), 0) || 0;
                    
                    return (
                      <tr key={receiving._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedReceivings.includes(receiving._id)}
                            onChange={() => toggleSelect(receiving._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {receiving.invoiceNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {receiving.supplier}
                            </div>
                            {receiving.invoiceAmount && (
                              <div className="text-sm text-gray-500">
                                {formatCurrency(receiving.invoiceAmount)}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {typeof receiving.purchaseOrder === 'object' 
                              ? receiving.purchaseOrder.poNumber 
                              : 'N/A'}
                          </div>
                          {typeof receiving.purchaseOrder === 'object' && receiving.purchaseOrder.status && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              getStatusColor(receiving.purchaseOrder.status)
                            }`}>
                              {getStatusLabel(receiving.purchaseOrder.status)}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(receiving.receivedDate)}
                          </div>
                          {receiving.receivedBy && (
                            <div className="flex items-center text-sm text-gray-500">
                              <User className="w-4 h-4 mr-1" />
                              {receiving.receivedBy.name}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {receiving.receivedProducts?.length || 0} items
                          </div>
                          <div className="text-sm text-gray-500">
                            {totalReceived}/{totalOrdered}
                          </div>
                          {totalReceived === 0 && (
                            <span className="text-xs text-orange-600">Zero receiving</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              getStatusColor(receiving.status)
                            }`}>
                              {getStatusLabel(receiving.status)}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {receiving.qcStatus ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              getQCStatusColor(receiving.qcStatus)
                            }`}>
                              {getQCStatusLabel(receiving.qcStatus)}
                            </span>
                          ) : receiving.qcRequired ? (
                            <span className="text-gray-400 text-sm">Pending</span>
                          ) : (
                            <span className="text-gray-400 text-sm">Not Required</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleView(receiving._id)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {canEdit(receiving) && (
                              <button
                                onClick={() => handleEdit(receiving._id)}
                                className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {canSubmitQC(receiving) && (
                              <button
                                onClick={() => handleSubmitToQC(receiving._id)}
                                className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors"
                                title="Submit to QC"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDownload(receiving)}
                              disabled={downloadingId === receiving._id}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors disabled:opacity-50"
                              title="Download PDF"
                            >
                              {downloadingId === receiving._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                            
                            {canDelete(receiving) && (
                              <button
                                onClick={() => {
                                  setDeletingId(receiving._id);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Mobile Cards - Continuation */}
            <div className="lg:hidden divide-y divide-gray-200">
              {invoiceReceivings.map((receiving) => {
                const totalReceived = receiving.receivedProducts?.reduce((sum, p) => sum + (p.receivedQuantity || 0), 0) || 0;
                const totalOrdered = receiving.receivedProducts?.reduce((sum, p) => sum + (p.orderedQuantity || 0), 0) || 0;
                
                return (
                  <div key={receiving._id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedReceivings.includes(receiving._id)}
                          onChange={() => toggleSelect(receiving._id)}
                          className="rounded border-gray-300 mr-3"
                        />
                        <div>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {receiving.invoiceNumber}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(receiving.receivedDate)}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getStatusColor(receiving.status)
                      }`}>
                        {getStatusLabel(receiving.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Supplier:</span>
                        <span className="ml-2 text-gray-900">{receiving.supplier}</span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-500">PO Number:</span>
                        <span className="ml-2 text-gray-900">
                          {typeof receiving.purchaseOrder === 'object' 
                            ? receiving.purchaseOrder.poNumber 
                            : 'N/A'}
                        </span>
                      </div>
                      
                      {receiving.invoiceAmount && (
                        <div className="text-sm">
                          <span className="text-gray-500">Amount:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {formatCurrency(receiving.invoiceAmount)}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="text-gray-500">Products:</span>
                        <span className="ml-2 text-gray-900">
                          {receiving.receivedProducts?.length || 0} items ({totalReceived}/{totalOrdered})
                        </span>
                        {totalReceived === 0 && (
                          <span className="ml-2 text-xs text-orange-600">Zero receiving</span>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-500">QC Status:</span>
                        {receiving.qcStatus ? (
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getQCStatusColor(receiving.qcStatus)
                          }`}>
                            {getQCStatusLabel(receiving.qcStatus)}
                          </span>
                        ) : (
                          <span className="ml-2 text-gray-400">
                            {receiving.qcRequired ? 'Pending' : 'Not Required'}
                          </span>
                        )}
                      </div>
                      
                      {receiving.receivedBy && (
                        <div className="text-sm">
                          <span className="text-gray-500">Received By:</span>
                          <span className="ml-2 text-gray-900">{receiving.receivedBy.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleView(receiving._id)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View Details
                      </button>
                      
                      <div className="flex items-center space-x-2">
                        {canEdit(receiving) && (
                          <button
                            onClick={() => handleEdit(receiving._id)}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canSubmitQC(receiving) && (
                          <button
                            onClick={() => handleSubmitToQC(receiving._id)}
                            className="text-purple-600 hover:text-purple-900 p-2 rounded-lg hover:bg-purple-50"
                            title="Submit to QC"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDownload(receiving)}
                          disabled={downloadingId === receiving._id}
                          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === receiving._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        
                        {canDelete(receiving) && (
                          <button
                            onClick={() => {
                              setDeletingId(receiving._id);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * (filters.limit || 10)) + 1} to {Math.min(currentPage * (filters.limit || 10), totalCount)} of {totalCount} results
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFilterChange('page', currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handleFilterChange('page', currentPage + 1)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Delete
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this invoice receiving? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceReceivingList;