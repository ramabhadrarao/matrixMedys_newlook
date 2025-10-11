// src/components/inventory/InventoryManagement.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Minus,
  Eye,
  Edit,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Building2,
  User,
  FileText,
  ArrowUpDown,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ShoppingCart,
  Archive
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import RoleBasedAccess from '../Auth/RoleBasedAccess';
import { usePermissions } from '../../hooks/usePermissions';
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
    name: string;
    role: string;
  };
  warehouse: {
    name: string;
    location: string;
  };
  createdAt: string;
  remarks?: string;
}

interface InventoryItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    category: string;
    unit: string;
    minStockLevel: number;
    maxStockLevel: number;
    reorderPoint: number;
  };
  warehouse: {
    _id: string;
    name: string;
    location: string;
  };
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  batchDetails: Array<{
    batchNumber: string;
    expiryDate?: string;
    quantity: number;
    receivedDate: string;
    status: 'active' | 'expired' | 'recalled';
  }>;
  lastMovement: {
    type: string;
    date: string;
    quantity: number;
  };
  stockStatus: 'normal' | 'low' | 'critical' | 'overstock' | 'out_of_stock';
  movements: StockMovement[];
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoon: number;
  totalMovements: number;
  recentMovements: StockMovement[];
}

const InventoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  const { canManageInventory, isInventoryManager, canAccessModule } = usePermissions();

  // Check if user can access inventory module
  if (!canAccessModule('inventory')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Inventory Management module.</p>
        </div>
      </div>
    );
  }
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Movement form data
  const [movementData, setMovementData] = useState({
    type: 'adjustment' as 'adjustment' | 'transfer' | 'reservation' | 'utilization',
    quantity: 0,
    reason: '',
    targetWarehouse: '',
    batchNumber: '',
    remarks: ''
  });

  useEffect(() => {
    loadInventoryData();
  }, [warehouseFilter, categoryFilter, statusFilter]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const [inventoryResponse, statsResponse] = await Promise.all([
      //   inventoryAPI.getAll({ warehouse: warehouseFilter, category: categoryFilter, status: statusFilter }),
      //   inventoryAPI.getStats()
      // ]);
      
      // Mock data for now
      const mockInventory: InventoryItem[] = [
        {
          _id: 'inv1',
          product: {
            _id: 'p1',
            name: 'Surgical Gloves - Latex Free',
            category: 'Medical Supplies',
            unit: 'boxes',
            minStockLevel: 50,
            maxStockLevel: 500,
            reorderPoint: 100
          },
          warehouse: {
            _id: 'w1',
            name: 'Main Warehouse',
            location: 'Building A, Floor 1'
          },
          currentStock: 250,
          reservedStock: 25,
          availableStock: 225,
          batchDetails: [
            {
              batchNumber: 'SG2024001',
              expiryDate: '2025-12-31T00:00:00Z',
              quantity: 150,
              receivedDate: '2024-01-15T00:00:00Z',
              status: 'active'
            },
            {
              batchNumber: 'SG2024002',
              expiryDate: '2025-06-30T00:00:00Z',
              quantity: 100,
              receivedDate: '2024-01-20T00:00:00Z',
              status: 'active'
            }
          ],
          lastMovement: {
            type: 'in',
            date: '2024-01-20T10:30:00Z',
            quantity: 100
          },
          stockStatus: 'normal',
          movements: [],
          totalIn: 500,
          totalOut: 250,
          totalAdjustments: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-20T10:30:00Z'
        },
        {
          _id: 'inv2',
          product: {
            _id: 'p2',
            name: 'Syringes 10ml Disposable',
            category: 'Medical Devices',
            unit: 'pieces',
            minStockLevel: 100,
            maxStockLevel: 1000,
            reorderPoint: 200
          },
          warehouse: {
            _id: 'w1',
            name: 'Main Warehouse',
            location: 'Building A, Floor 1'
          },
          currentStock: 75,
          reservedStock: 0,
          availableStock: 75,
          batchDetails: [
            {
              batchNumber: 'SY2024001',
              expiryDate: '2026-06-30T00:00:00Z',
              quantity: 75,
              receivedDate: '2024-01-10T00:00:00Z',
              status: 'active'
            }
          ],
          lastMovement: {
            type: 'out',
            date: '2024-01-18T14:20:00Z',
            quantity: 25
          },
          stockStatus: 'low',
          movements: [],
          totalIn: 500,
          totalOut: 425,
          totalAdjustments: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-18T14:20:00Z'
        },
        {
          _id: 'inv3',
          product: {
            _id: 'p3',
            name: 'Bandages Elastic 4 inch',
            category: 'Medical Supplies',
            unit: 'rolls',
            minStockLevel: 20,
            maxStockLevel: 200,
            reorderPoint: 40
          },
          warehouse: {
            _id: 'w2',
            name: 'Secondary Warehouse',
            location: 'Building B, Floor 2'
          },
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          batchDetails: [],
          lastMovement: {
            type: 'out',
            date: '2024-01-19T09:15:00Z',
            quantity: 15
          },
          stockStatus: 'out_of_stock',
          movements: [],
          totalIn: 200,
          totalOut: 200,
          totalAdjustments: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-19T09:15:00Z'
        }
      ];

      const mockStats: InventoryStats = {
        totalItems: 3,
        totalValue: 125000,
        lowStockItems: 1,
        outOfStockItems: 1,
        expiringSoon: 0,
        totalMovements: 15,
        recentMovements: [
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
              name: 'John Doe',
              role: 'Warehouse Staff'
            },
            warehouse: {
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            createdAt: '2024-01-20T10:30:00Z'
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
              name: 'Jane Smith',
              role: 'Inventory Manager'
            },
            warehouse: {
              name: 'Main Warehouse',
              location: 'Building A, Floor 1'
            },
            createdAt: '2024-01-18T14:20:00Z'
          }
        ]
      };
      
      setInventory(mockInventory);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || movementData.quantity === 0) return;

    try {
      // TODO: Replace with actual API call
      // await inventoryAPI.adjustStock(selectedItem._id, {
      //   quantity: movementData.quantity,
      //   reason: movementData.reason,
      //   batchNumber: movementData.batchNumber,
      //   remarks: movementData.remarks
      // });
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item._id === selectedItem._id 
          ? { 
              ...item, 
              currentStock: item.currentStock + movementData.quantity,
              availableStock: item.availableStock + movementData.quantity,
              lastMovement: {
                type: movementData.quantity > 0 ? 'in' : 'out',
                date: new Date().toISOString(),
                quantity: Math.abs(movementData.quantity)
              }
            }
          : item
      ));
      
      toast.success('Stock adjustment completed successfully');
      setShowAdjustmentModal(false);
      resetMovementData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const handleStockTransfer = async () => {
    if (!selectedItem || movementData.quantity <= 0 || !movementData.targetWarehouse) return;

    try {
      // TODO: Replace with actual API call
      // await inventoryAPI.transferStock(selectedItem._id, {
      //   quantity: movementData.quantity,
      //   targetWarehouse: movementData.targetWarehouse,
      //   reason: movementData.reason,
      //   batchNumber: movementData.batchNumber,
      //   remarks: movementData.remarks
      // });
      
      toast.success('Stock transfer initiated successfully');
      setShowTransferModal(false);
      resetMovementData();
      loadInventoryData(); // Reload to get updated data
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Failed to transfer stock');
    }
  };

  const handleReservation = async () => {
    if (!selectedItem || movementData.quantity <= 0) return;

    try {
      // TODO: Replace with actual API call
      // await inventoryAPI.reserveStock(selectedItem._id, {
      //   quantity: movementData.quantity,
      //   reason: movementData.reason,
      //   remarks: movementData.remarks
      // });
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item._id === selectedItem._id 
          ? { 
              ...item, 
              reservedStock: item.reservedStock + movementData.quantity,
              availableStock: item.availableStock - movementData.quantity
            }
          : item
      ));
      
      toast.success('Stock reserved successfully');
      setShowMovementModal(false);
      resetMovementData();
    } catch (error) {
      console.error('Error reserving stock:', error);
      toast.error('Failed to reserve stock');
    }
  };

  const resetMovementData = () => {
    setMovementData({
      type: 'adjustment',
      quantity: 0,
      reason: '',
      targetWarehouse: '',
      batchNumber: '',
      remarks: ''
    });
    setSelectedItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'out_of_stock':
        return 'bg-gray-100 text-gray-800';
      case 'overstock':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="w-4 h-4" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'out_of_stock':
        return <Archive className="w-4 h-4" />;
      case 'overstock':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
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

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = !warehouseFilter || item.warehouse._id === warehouseFilter;
    const matchesCategory = !categoryFilter || item.product.category === categoryFilter;
    const matchesStatus = !statusFilter || item.stockStatus === statusFilter;
    
    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.product.name;
        bValue = b.product.name;
        break;
      case 'stock':
        aValue = a.currentStock;
        bValue = b.currentStock;
        break;
      case 'status':
        aValue = a.stockStatus;
        bValue = b.stockStatus;
        break;
      case 'lastMovement':
        aValue = new Date(a.lastMovement.date);
        bValue = new Date(b.lastMovement.date);
        break;
      default:
        aValue = a.product.name;
        bValue = b.product.name;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedInventory = sortedInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage product inventory across all warehouses</p>
        </div>
        
        <div className="flex space-x-3">
          <RoleBasedAccess permissions={['inventory', 'create']}>
            <button
              onClick={() => navigate('/inventory/adjustment')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Stock Adjustment
            </button>
          </RoleBasedAccess>
          
          <RoleBasedAccess permissions={['inventory', 'export']}>
            <button
              onClick={() => {/* TODO: Export functionality */}}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </RoleBasedAccess>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</div>
                <div className="text-sm text-gray-600">Low Stock</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.outOfStockItems}</div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RefreshCw className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalMovements}</div>
                <div className="text-sm text-gray-600">Total Movements</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Warehouses</option>
            <option value="w1">Main Warehouse</option>
            <option value="w2">Secondary Warehouse</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="Medical Supplies">Medical Supplies</option>
            <option value="Medical Devices">Medical Devices</option>
            <option value="Pharmaceuticals">Pharmaceuticals</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="normal">Normal</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="overstock">Overstock</option>
          </select>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="stock">Sort by Stock</option>
              <option value="status">Sort by Status</option>
              <option value="lastMovement">Sort by Last Movement</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Levels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Movement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInventory.map((item) => (
                <motion.tr
                  key={item._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                      <div className="text-sm text-gray-500">{item.product.category}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{item.warehouse.name}</div>
                      <div className="text-sm text-gray-500">{item.warehouse.location}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Current: <span className="font-medium">{item.currentStock}</span> {item.product.unit}</div>
                      <div>Available: <span className="font-medium">{item.availableStock}</span> {item.product.unit}</div>
                      {item.reservedStock > 0 && (
                        <div>Reserved: <span className="font-medium text-yellow-600">{item.reservedStock}</span> {item.product.unit}</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusColor(item.stockStatus)
                    }`}>
                      {getStatusIcon(item.stockStatus)}
                      <span className="ml-1 capitalize">{item.stockStatus.replace('_', ' ')}</span>
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="flex items-center">
                        {item.lastMovement.type === 'in' ? (
                          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                        )}
                        <span className="capitalize">{item.lastMovement.type}</span>
                        <span className="ml-1">({item.lastMovement.quantity})</span>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(item.lastMovement.date)}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowHistoryModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      
                      {hasPermission('inventory', 'update') && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementData(prev => ({ ...prev, type: 'adjustment' }));
                              setShowAdjustmentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Stock Adjustment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementData(prev => ({ ...prev, type: 'transfer' }));
                              setShowTransferModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title="Transfer Stock"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementData(prev => ({ ...prev, type: 'reservation' }));
                              setShowMovementModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors"
                            title="Reserve Stock"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
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
                    {Math.min(currentPage * itemsPerPage, sortedInventory.length)}
                  </span>{' '}
                  of <span className="font-medium">{sortedInventory.length}</span> results
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

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Stock Adjustment - {selectedItem.product.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock: {selectedItem.currentStock} {selectedItem.product.unit}
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Quantity (+ for increase, - for decrease)
                </label>
                <input
                  type="number"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter adjustment quantity"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={movementData.reason}
                  onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select reason</option>
                  <option value="damaged_goods">Damaged Goods</option>
                  <option value="expired_items">Expired Items</option>
                  <option value="inventory_count">Inventory Count Correction</option>
                  <option value="quality_issue">Quality Issue</option>
                  <option value="system_error">System Error Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number (Optional)</label>
                <input
                  type="text"
                  value={movementData.batchNumber}
                  onChange={(e) => setMovementData(prev => ({ ...prev, batchNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter batch number if applicable"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={movementData.remarks}
                  onChange={(e) => setMovementData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional remarks..."
                />
              </div>
              
              {movementData.quantity !== 0 && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm text-gray-600">
                    New Stock Level: <span className="font-medium">
                      {selectedItem.currentStock + movementData.quantity} {selectedItem.product.unit}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  resetMovementData();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleStockAdjustment}
                disabled={movementData.quantity === 0 || !movementData.reason}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Stock Transfer - {selectedItem.product.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Stock: {selectedItem.availableStock} {selectedItem.product.unit}
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  max={selectedItem.availableStock}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity to transfer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Warehouse</label>
                <select
                  value={movementData.targetWarehouse}
                  onChange={(e) => setMovementData(prev => ({ ...prev, targetWarehouse: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select target warehouse</option>
                  <option value="w1">Main Warehouse</option>
                  <option value="w2">Secondary Warehouse</option>
                  <option value="w3">Emergency Warehouse</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Reason</label>
                <select
                  value={movementData.reason}
                  onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select reason</option>
                  <option value="rebalancing">Stock Rebalancing</option>
                  <option value="urgent_request">Urgent Request</option>
                  <option value="maintenance">Warehouse Maintenance</option>
                  <option value="optimization">Inventory Optimization</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={movementData.remarks}
                  onChange={(e) => setMovementData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional remarks..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  resetMovementData();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleStockTransfer}
                disabled={movementData.quantity <= 0 || !movementData.targetWarehouse || !movementData.reason || movementData.quantity > selectedItem.availableStock}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Transfer Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Reservation Modal */}
      {showMovementModal && selectedItem && movementData.type === 'reservation' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reserve Stock - {selectedItem.product.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Stock: {selectedItem.availableStock} {selectedItem.product.unit}
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Quantity</label>
                <input
                  type="number"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  max={selectedItem.availableStock}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity to reserve"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Reason</label>
                <select
                  value={movementData.reason}
                  onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select reason</option>
                  <option value="hospital_order">Hospital Order</option>
                  <option value="emergency_reserve">Emergency Reserve</option>
                  <option value="planned_surgery">Planned Surgery</option>
                  <option value="quality_hold">Quality Hold</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={movementData.remarks}
                  onChange={(e) => setMovementData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional remarks..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  resetMovementData();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleReservation}
                disabled={movementData.quantity <= 0 || !movementData.reason || movementData.quantity > selectedItem.availableStock}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                Reserve Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Stock History - {selectedItem.product.name}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Current Stock Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Current Stock</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedItem.currentStock} {selectedItem.product.unit}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Available</div>
                  <div className="text-lg font-semibold text-green-600">
                    {selectedItem.availableStock} {selectedItem.product.unit}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Reserved</div>
                  <div className="text-lg font-semibold text-yellow-600">
                    {selectedItem.reservedStock} {selectedItem.product.unit}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getStatusColor(selectedItem.stockStatus)
                  }`}>
                    {getStatusIcon(selectedItem.stockStatus)}
                    <span className="ml-1 capitalize">{selectedItem.stockStatus.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Batch Details */}
            {selectedItem.batchDetails.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Batch Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedItem.batchDetails.map((batch, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{batch.batchNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{batch.quantity} {selectedItem.product.unit}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatDate(batch.receivedDate)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {batch.expiryDate ? formatDate(batch.expiryDate) : 'N/A'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              batch.status === 'active' ? 'bg-green-100 text-green-800' :
                              batch.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {batch.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Movement History */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Recent Movements</h4>
              {stats?.recentMovements.length ? (
                <div className="space-y-3">
                  {stats.recentMovements.map((movement) => (
                    <div key={movement._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            movement.type === 'in' ? 'bg-green-100' :
                            movement.type === 'out' ? 'bg-red-100' :
                            movement.type === 'adjustment' ? 'bg-blue-100' :
                            movement.type === 'transfer' ? 'bg-purple-100' :
                            movement.type === 'reservation' ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            {movement.type === 'in' && <TrendingUp className="w-4 h-4 text-green-600" />}
                            {movement.type === 'out' && <TrendingDown className="w-4 h-4 text-red-600" />}
                            {movement.type === 'adjustment' && <Edit className="w-4 h-4 text-blue-600" />}
                            {movement.type === 'transfer' && <Truck className="w-4 h-4 text-purple-600" />}
                            {movement.type === 'reservation' && <ShoppingCart className="w-4 h-4 text-orange-600" />}
                            {movement.type === 'utilization' && <Archive className="w-4 h-4 text-gray-600" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {movement.type}
                              </span>
                              <span className={`text-sm font-medium ${
                                movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {movement.type === 'in' ? '+' : '-'}{movement.quantity} {selectedItem.product.unit}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mt-1">
                              {movement.reason}
                              {movement.reference && (
                                <span className="ml-2">
                                  (Ref: {movement.reference.number})
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(movement.createdAt)} by {movement.performedBy.name}
                            </div>
                            
                            {movement.remarks && (
                              <div className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">
                                {movement.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No movement history available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;