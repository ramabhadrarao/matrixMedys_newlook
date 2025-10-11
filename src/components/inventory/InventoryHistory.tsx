// src/components/inventory/InventoryHistory.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Edit,
  Truck,
  ShoppingCart,
  Archive,
  User,
  Building2,
  FileText,
  Clock,
  BarChart3,
  RefreshCw,
  Eye,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface StockMovement {
  _id: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'reservation' | 'utilization';
  quantity: number;
  reason: string;
  reference?: {
    type: 'invoice' | 'po' | 'transfer' | 'adjustment' | 'reservation' | 'utilization';
    id: string;
    number: string;
  };
  performedBy: {
    _id: string;
    name: string;
    role: string;
  };
  warehouse: {
    _id: string;
    name: string;
    location: string;
  };
  targetWarehouse?: {
    _id: string;
    name: string;
    location: string;
  };
  batchNumber?: string;
  balanceAfter: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}

interface InventoryHistoryData {
  product: Product;
  currentStock: number;
  totalMovements: number;
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  movements: StockMovement[];
  summary: {
    thisMonth: {
      in: number;
      out: number;
      adjustments: number;
    };
    lastMonth: {
      in: number;
      out: number;
      adjustments: number;
    };
  };
}

const InventoryHistory: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<InventoryHistoryData | null>(null);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    if (productId) {
      loadHistoryData();
    }
  }, [productId]);

  useEffect(() => {
    if (historyData) {
      applyFilters();
    }
  }, [historyData, searchTerm, typeFilter, warehouseFilter, dateRange]);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await inventoryAPI.getProductHistory(productId);
      
      // Mock data for now
      const mockData: InventoryHistoryData = {
        product: {
          _id: productId!,
          name: 'Surgical Gloves - Latex Free',
          category: 'Medical Supplies',
          unit: 'boxes',
          description: 'High-quality latex-free surgical gloves for medical procedures'
        },
        currentStock: 250,
        totalMovements: 25,
        totalIn: 1500,
        totalOut: 1250,
        totalAdjustments: 0,
        summary: {
          thisMonth: {
            in: 300,
            out: 200,
            adjustments: 0
          },
          lastMonth: {
            in: 250,
            out: 180,
            adjustments: -5
          }
        },
        movements: [
          {
            _id: 'mov1',
            type: 'in',
            quantity: 100,
            reason: 'Invoice receiving',
            reference: {
              type: 'invoice',
              id: 'inv1',
              number: 'INV-2024-001'
            },
            performedBy: {
              _id: 'user1',
              name: 'John Doe',
              role: 'Warehouse Staff'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            batchNumber: 'SG2024002',
            balanceAfter: 250,
            createdAt: '2024-01-20T10:30:00Z',
            updatedAt: '2024-01-20T10:30:00Z'
          },
          {
            _id: 'mov2',
            type: 'out',
            quantity: 25,
            reason: 'Hospital requisition',
            reference: {
              type: 'utilization',
              id: 'req1',
              number: 'REQ-2024-001'
            },
            performedBy: {
              _id: 'user2',
              name: 'Jane Smith',
              role: 'Inventory Manager'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            balanceAfter: 150,
            remarks: 'Emergency surgery requirement',
            createdAt: '2024-01-18T14:20:00Z',
            updatedAt: '2024-01-18T14:20:00Z'
          },
          {
            _id: 'mov3',
            type: 'transfer',
            quantity: 50,
            reason: 'Stock rebalancing',
            reference: {
              type: 'transfer',
              id: 'tr1',
              number: 'TR-2024-001'
            },
            performedBy: {
              _id: 'user3',
              name: 'Mike Johnson',
              role: 'Warehouse Manager'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            targetWarehouse: {
              _id: 'w2',
              name: 'Secondary Warehouse',
              location: 'Building B, Floor 2'
            },
            balanceAfter: 175,
            remarks: 'Balancing stock levels across warehouses',
            createdAt: '2024-01-17T09:15:00Z',
            updatedAt: '2024-01-17T09:15:00Z'
          },
          {
            _id: 'mov4',
            type: 'reservation',
            quantity: 30,
            reason: 'Planned surgery',
            reference: {
              type: 'reservation',
              id: 'res1',
              number: 'RES-2024-001'
            },
            performedBy: {
              _id: 'user4',
              name: 'Sarah Wilson',
              role: 'Surgery Coordinator'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            balanceAfter: 225,
            remarks: 'Reserved for cardiac surgery scheduled for next week',
            createdAt: '2024-01-16T16:45:00Z',
            updatedAt: '2024-01-16T16:45:00Z'
          },
          {
            _id: 'mov5',
            type: 'adjustment',
            quantity: -5,
            reason: 'Damaged goods',
            reference: {
              type: 'adjustment',
              id: 'adj1',
              number: 'ADJ-2024-001'
            },
            performedBy: {
              _id: 'user5',
              name: 'Tom Brown',
              role: 'Quality Control'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            batchNumber: 'SG2024001',
            balanceAfter: 255,
            remarks: 'Found damaged packaging during routine inspection',
            createdAt: '2024-01-15T11:20:00Z',
            updatedAt: '2024-01-15T11:20:00Z'
          },
          {
            _id: 'mov6',
            type: 'in',
            quantity: 200,
            reason: 'Purchase order receiving',
            reference: {
              type: 'po',
              id: 'po1',
              number: 'PO-2024-001'
            },
            performedBy: {
              _id: 'user1',
              name: 'John Doe',
              role: 'Warehouse Staff'
            },
            warehouse: {
              _id: 'w1',
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            batchNumber: 'SG2024001',
            balanceAfter: 260,
            createdAt: '2024-01-10T08:30:00Z',
            updatedAt: '2024-01-10T08:30:00Z'
          }
        ]
      };
      
      setHistoryData(mockData);
    } catch (error) {
      console.error('Error loading history data:', error);
      toast.error('Failed to load inventory history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!historyData) return;

    let filtered = [...historyData.movements];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(movement =>
        movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.performedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (movement.reference?.number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (movement.remarks?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(movement => movement.type === typeFilter);
    }

    // Warehouse filter
    if (warehouseFilter) {
      filtered = filtered.filter(movement => movement.warehouse._id === warehouseFilter);
    }

    // Date range filter
    if (dateRange.startDate) {
      filtered = filtered.filter(movement => 
        new Date(movement.createdAt) >= new Date(dateRange.startDate)
      );
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(movement => 
        new Date(movement.createdAt) <= new Date(dateRange.endDate + 'T23:59:59')
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredMovements(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const exportHistory = () => {
    if (!historyData) return;

    // TODO: Implement actual export functionality
    // This could generate CSV, Excel, or PDF reports
    toast.success('Export functionality will be implemented');
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'adjustment':
        return <Edit className="w-5 h-5 text-blue-600" />;
      case 'transfer':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'reservation':
        return <ShoppingCart className="w-5 h-5 text-orange-600" />;
      case 'utilization':
        return <Archive className="w-5 h-5 text-gray-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-50 border-green-200';
      case 'out':
        return 'bg-red-50 border-red-200';
      case 'adjustment':
        return 'bg-blue-50 border-blue-200';
      case 'transfer':
        return 'bg-purple-50 border-purple-200';
      case 'reservation':
        return 'bg-orange-50 border-orange-200';
      case 'utilization':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
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

  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Product Not Found</h3>
        <p className="text-gray-600 mb-4">The requested product history could not be loaded.</p>
        <button
          onClick={() => navigate('/inventory')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/inventory')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{historyData.product.name}</h1>
            <p className="text-gray-600 mt-1">Complete inventory movement history</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportHistory}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button
            onClick={loadHistoryData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Product Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600">Current Stock</div>
            <div className="text-2xl font-bold text-gray-900">
              {historyData.currentStock} {historyData.product.unit}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Total Movements</div>
            <div className="text-2xl font-bold text-blue-600">{historyData.totalMovements}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Total Received</div>
            <div className="text-2xl font-bold text-green-600">
              +{historyData.totalIn} {historyData.product.unit}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Total Issued</div>
            <div className="text-2xl font-bold text-red-600">
              -{historyData.totalOut} {historyData.product.unit}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Received</span>
              <span className="text-sm font-medium text-green-600">
                +{historyData.summary.thisMonth.in} {historyData.product.unit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Issued</span>
              <span className="text-sm font-medium text-red-600">
                -{historyData.summary.thisMonth.out} {historyData.product.unit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Adjustments</span>
              <span className={`text-sm font-medium ${
                historyData.summary.thisMonth.adjustments >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {historyData.summary.thisMonth.adjustments >= 0 ? '+' : ''}{historyData.summary.thisMonth.adjustments} {historyData.product.unit}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Received</span>
              <span className="text-sm font-medium text-green-600">
                +{historyData.summary.lastMonth.in} {historyData.product.unit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Issued</span>
              <span className="text-sm font-medium text-red-600">
                -{historyData.summary.lastMonth.out} {historyData.product.unit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Adjustments</span>
              <span className={`text-sm font-medium ${
                historyData.summary.lastMonth.adjustments >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {historyData.summary.lastMonth.adjustments >= 0 ? '+' : ''}{historyData.summary.lastMonth.adjustments} {historyData.product.unit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjustment">Adjustments</option>
            <option value="transfer">Transfers</option>
            <option value="reservation">Reservations</option>
            <option value="utilization">Utilization</option>
          </select>
          
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Warehouses</option>
            <option value="w1">Main Warehouse</option>
            <option value="w2">Secondary Warehouse</option>
          </select>
          
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start Date"
          />
          
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End Date"
          />
        </div>
        
        {(searchTerm || typeFilter || warehouseFilter || dateRange.startDate || dateRange.endDate) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredMovements.length} of {historyData.movements.length} movements
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setWarehouseFilter('');
                setDateRange({ startDate: '', endDate: '' });
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Movement History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Movement History</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {paginatedMovements.length > 0 ? (
            paginatedMovements.map((movement) => (
              <motion.div
                key={movement._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 ${getMovementColor(movement.type)} border-l-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getMovementIcon(movement.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900 capitalize">
                          {movement.type}
                        </span>
                        <span className={`text-lg font-bold ${
                          movement.type === 'in' || (movement.type === 'adjustment' && movement.quantity > 0)
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {movement.type === 'in' || (movement.type === 'adjustment' && movement.quantity > 0) ? '+' : '-'}
                          {Math.abs(movement.quantity)} {historyData.product.unit}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Reason:</strong> {movement.reason}
                        {movement.reference && (
                          <span className="ml-2 text-blue-600">
                            (Ref: {movement.reference.number})
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          <span>{movement.performedBy.name} ({movement.performedBy.role})</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2" />
                          <span>{movement.warehouse.name}</span>
                        </div>
                        
                        {movement.targetWarehouse && (
                          <div className="flex items-center">
                            <Truck className="w-4 h-4 mr-2" />
                            <span>To: {movement.targetWarehouse.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatDate(movement.createdAt)}</span>
                        </div>
                        
                        {movement.batchNumber && (
                          <div className="flex items-center">
                            <Package className="w-4 h-4 mr-2" />
                            <span>Batch: {movement.batchNumber}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          <span>Balance: {movement.balanceAfter} {historyData.product.unit}</span>
                        </div>
                      </div>
                      
                      {movement.remarks && (
                        <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg">
                          <div className="flex items-start">
                            <FileText className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
                            <span className="text-sm text-gray-700">{movement.remarks}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Movements Found</h3>
              <p className="text-gray-600">
                {searchTerm || typeFilter || warehouseFilter || dateRange.startDate || dateRange.endDate
                  ? 'No movements match your current filters.'
                  : 'No movement history available for this product.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredMovements.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredMovements.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryHistory;